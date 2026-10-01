import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { createOrderLimiter, getClientIp } from '@/lib/rate-limit';
import { getProducts, getVariantsByIds, validateCouponCode } from '@/lib/data';
import { STORE_CONFIG } from '@/lib/config';
import { calculateShippingFee, validateAddress } from '@/lib/shipping';
import { Address } from '@/types';

/**
 * POST /api/razorpay/create-order
 *
 * Security contract:
 *  - The client sends cart items + coupon + shipping_fee (NOT a price/total).
 *  - This route fetches CURRENT prices from Supabase for every item/variant and
 *    recalculates the total entirely server-side.
 *  - The Razorpay order is created for the server-calculated total ONLY.
 *  - Client-supplied prices are never trusted.
 *  - Order notes contain compact cart data for webhook fallback (in case the
 *    browser closes before verify-payment completes).
 */

interface CreateOrderItem {
  product_id: string;
  variant_id?: string;
  size?: string;
  quantity: number;
  name?: string;
  image?: string;
}

export async function POST(request: Request) {
  // ── Rate limiting: 10 requests / minute / IP ────────────────────────────
  const ip = getClientIp(request);
  const { success: allowed, remaining } = createOrderLimiter.check(ip);
  if (!allowed) {
    return NextResponse.json(
      { success: false, message: 'Too many requests. Please wait a moment before retrying.' },
      { status: 429, headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': '0' } }
    );
  }

  try {
    const body = await request.json();
    const {
      items,
      coupon_code,
      shipping_fee: clientShippingFee,
      user_id,
      contact_email,
      shipping_address,
    }: {
      items: CreateOrderItem[];
      coupon_code?: string;
      shipping_fee: number;
      user_id?: string;
      contact_email?: string;
      shipping_address?: Partial<Address>;
    } = body;

    // ── Input validation ────────────────────────────────────────────────────
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, message: 'Cart is empty.' }, { status: 400 });
    }

    // ── 1. Fetch current prices from DB (prevents price spoofing) ──────────
    const allProducts = await getProducts();
    const variantIds = items
      .filter((i) => i.variant_id)
      .map((i) => i.variant_id as string);
    const allVariants = variantIds.length > 0 ? await getVariantsByIds(variantIds) : [];

    // ── 2. Recalculate subtotal server-side ──────────────────────────────
    let calculatedSubtotal = 0;
    const verifiedItems: Array<{
      product_id: string;
      name: string;
      price: number;
      quantity: number;
      image: string;
      variant_id?: string;
      size?: string;
    }> = [];

    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity < 1 || item.quantity > 100) {
        return NextResponse.json({ success: false, message: 'Invalid item in cart.' }, { status: 400 });
      }

      const dbProduct = allProducts.find((p) => p.id === item.product_id);
      if (!dbProduct || !dbProduct.is_active) {
        return NextResponse.json(
          { success: false, message: `"${item.name || 'A product'}" is no longer available.` },
          { status: 400 }
        );
      }

      let truePrice: number;
      if (item.variant_id) {
        const dbVariant = allVariants.find((v) => v.id === item.variant_id);
        if (!dbVariant || !dbVariant.is_active) {
          return NextResponse.json(
            {
              success: false,
              message: `Size "${item.size || item.variant_id}" for "${dbProduct.name}" is no longer available.`,
            },
            { status: 400 }
          );
        }
        truePrice = dbVariant.price;
      } else {
        truePrice = dbProduct.price;
      }

      calculatedSubtotal += truePrice * item.quantity;
      verifiedItems.push({
        product_id: dbProduct.id,
        name: dbProduct.name,
        price: truePrice,
        quantity: item.quantity,
        image: item.image || dbProduct.images?.[0] || '',
        ...(item.variant_id ? { variant_id: item.variant_id } : {}),
        ...(item.size ? { size: item.size } : {}),
      });
    }

    // ── 3. Re-validate coupon server-side ─────────────────────────────────
    let calculatedDiscount = 0;
    let isFreeShipping = false;
    let verifiedCouponCode = '';

    if (coupon_code && coupon_code.trim()) {
      const couponRes = await validateCouponCode(coupon_code.trim(), calculatedSubtotal);
      if (couponRes.success) {
        calculatedDiscount = couponRes.discountAmount;
        isFreeShipping = couponRes.isFreeShipping;
        verifiedCouponCode = coupon_code.trim().toUpperCase();
      }
      // Invalid/expired coupon: silently ignored so the customer isn't blocked;
      // verify-payment will also not apply it, so no discount will be applied.
    }

    // ── 4. Calculate authoritative state-based shipping server-side ────────
    // Never trust client-supplied shipping fee.
    // If state is Tamil Nadu -> ₹150; all other states -> ₹200; Free shipping coupon -> ₹0
    if (shipping_address) {
      const addrVal = validateAddress(shipping_address);
      if (!addrVal.valid) {
        const firstErr = Object.values(addrVal.errors)[0];
        return NextResponse.json(
          { success: false, message: `Invalid delivery address: ${firstErr}` },
          { status: 400 }
        );
      }
    }

    const calculatedShipping = calculateShippingFee(shipping_address?.state, isFreeShipping);

    // ── 5. Authoritative total ────────────────────────────────────────────
    const calculatedTotal = Math.max(0, calculatedSubtotal - calculatedDiscount) + calculatedShipping;
    if (calculatedTotal <= 0) {
      return NextResponse.json({ success: false, message: 'Order total is invalid.' }, { status: 400 });
    }

    const amountInPaise = Math.round(calculatedTotal * 100);

    // ── 6. Build Razorpay order notes for webhook fallback ─────────────────
    // Compact items: "product_id~variant_id~size~qty|..." (fits in 256-char notes value)
    const compactItems = verifiedItems
      .map((i) => `${i.product_id}~${i.variant_id || ''}~${i.size || ''}~${i.quantity}`)
      .join('|');

    const custEmail = (contact_email || (shipping_address as any)?.email || '').trim();

    const notes: Record<string, string> = {
      user_id: user_id ? user_id.slice(0, 256) : 'guest',
      coupon: verifiedCouponCode.slice(0, 256),
      subtotal: String(calculatedSubtotal),
      discount: String(calculatedDiscount),
      shipping: String(calculatedShipping),
      total: String(calculatedTotal),
    };

    // Only store items in notes if the string fits within Razorpay's 256-char limit
    if (compactItems.length <= 256) {
      notes.items = compactItems;
    } else {
      // Truncation fallback: store only product/variant IDs (webhook path is a best-effort fallback)
      const minimalItems = verifiedItems
        .map((i) => `${i.product_id}~${i.variant_id || ''}~${i.size || ''}~${i.quantity}`)
        .join('|')
        .slice(0, 256);
      notes.items = minimalItems;
    }

    if (custEmail) {
      notes.contact_email = custEmail.slice(0, 256);
      notes.cust_email = custEmail.slice(0, 256);
    }
    if (shipping_address?.id) {
      notes.address_id = String(shipping_address.id).slice(0, 256);
    }
    if (shipping_address?.name) notes.cust_name = shipping_address.name.slice(0, 256);
    if (shipping_address?.phone) notes.cust_phone = shipping_address.phone.slice(0, 256);
    if (shipping_address?.line1) notes.cust_line1 = shipping_address.line1.slice(0, 256);
    if (shipping_address?.line2) notes.cust_line2 = shipping_address.line2.slice(0, 256);
    if (shipping_address?.city) notes.cust_city = shipping_address.city.slice(0, 256);
    if (shipping_address?.state) notes.cust_state = shipping_address.state.slice(0, 256);
    if (shipping_address?.pincode) notes.cust_pincode = shipping_address.pincode.slice(0, 256);

    // ── 7. Create Razorpay order ──────────────────────────────────────────
    const key_id = process.env.RAZORPAY_KEY_ID || '';
    const key_secret = process.env.RAZORPAY_KEY_SECRET || '';
    const isLive =
      key_id && key_secret && !key_id.includes('placeholder') && !key_secret.includes('placeholder');

    if (isLive) {
      const instance = new Razorpay({ key_id, key_secret });

      const razorpayOrder = await instance.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        // receipt max 40 chars
        receipt: `sr_${Date.now()}`.slice(0, 40),
        notes,
      });

      return NextResponse.json(
        {
          success: true,
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          key: key_id,
          calculatedTotal,
        },
        { headers: { 'X-RateLimit-Remaining': String(remaining) } }
      );
    }

    // ── Demo / dev fallback — no real charge ──────────────────────────────
    const mockOrderId = `order_test_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    return NextResponse.json({
      success: true,
      id: mockOrderId,
      amount: amountInPaise,
      currency: 'INR',
      key: key_id || 'rzp_test_demo_key',
      calculatedTotal,
    });
  } catch (error: any) {
    // Log error detail without exposing secrets
    console.error('[create-order] Error:', {
      message: error?.message,
      statusCode: error?.statusCode,
    });
    return NextResponse.json(
      { success: false, message: 'Failed to create order. Please try again.' },
      { status: 500 }
    );
  }
}

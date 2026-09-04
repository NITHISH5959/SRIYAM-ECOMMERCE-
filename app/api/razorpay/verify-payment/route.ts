import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createOrder, deductStock, deductVariantStock, getVariantsByIds, getProducts, validateCouponCode, incrementCouponUsageCount } from '@/lib/data';
import { validateEnv } from '@/lib/env';
import { verifyPaymentLimiter, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  // Rate limiting: 5 verify attempts per minute per IP
  const ip = getClientIp(request);
  const { success: allowed } = verifyPaymentLimiter.check(ip);
  if (!allowed) {
    return NextResponse.json(
      { success: false, message: 'Too many payment attempts. Please wait before retrying.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  try {
    validateEnv();

    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData } = body;

    if (!orderData || !orderData.items || orderData.items.length === 0) {
      return NextResponse.json({ success: false, message: 'Invalid order data: No items' }, { status: 400 });
    }

    // ── 1. Fetch lookup data: products + variants ─────────────────────────────
    const allProducts = await getProducts();

    // Collect variant IDs from Frame items
    const variantIds: string[] = orderData.items
      .filter((i: any) => i.variant_id)
      .map((i: any) => i.variant_id);
    const allVariants = await getVariantsByIds(variantIds);

    // ── 2. Recalculate Subtotal & Verify Items Server-Side ────────────────────
    let calculatedSubtotal = 0;
    const verifiedItems = [];

    for (const item of orderData.items) {
      const dbProduct = allProducts.find((p) => p.id === item.product_id);
      if (!dbProduct) {
        return NextResponse.json({ success: false, message: 'One or more products could not be verified.' }, { status: 400 });
      }

      let truePrice: number;

      if (item.variant_id) {
        // Frame product — look up price from product_variants (prevents price spoofing)
        const dbVariant = allVariants.find((v) => v.id === item.variant_id);
        if (!dbVariant) {
          return NextResponse.json(
            { success: false, message: `Variant for "${dbProduct.name}" (${item.size || ''}) could not be verified.` },
            { status: 400 }
          );
        }
        truePrice = dbVariant.price;
      } else {
        // Rack Poster — use products.price
        truePrice = dbProduct.price;
      }

      calculatedSubtotal += truePrice * item.quantity;

      verifiedItems.push({
        product_id: dbProduct.id,
        name: dbProduct.name,
        price: truePrice,
        quantity: item.quantity,
        image: item.image || dbProduct.images?.[0] || '',
        // Preserve variant metadata in the stored order item
        ...(item.variant_id && { variant_id: item.variant_id }),
        ...(item.size && { size: item.size }),
      });
    }

    // ── 3. Validate Coupon Server-Side ──────────────────────────────────────
    let calculatedDiscount = 0;
    let isFreeShipping = false;

    if (orderData.coupon_code) {
      const couponRes = await validateCouponCode(orderData.coupon_code, calculatedSubtotal);
      if (couponRes.success) {
        calculatedDiscount = couponRes.discountAmount;
        isFreeShipping = couponRes.isFreeShipping;
      }
    }

    // ── 4. Validate Shipping Server-Side ────────────────────────────────────
    let calculatedShipping = 0;
    const freeShippingThreshold = 999;
    const defaultShippingFee = 50;

    if (calculatedSubtotal < freeShippingThreshold && !isFreeShipping) {
      calculatedShipping =
        orderData.shipping_fee > 0 ? orderData.shipping_fee : defaultShippingFee;
    }

    const calculatedTotal =
      Math.max(0, calculatedSubtotal - calculatedDiscount) + calculatedShipping;

    // ── 5. Stock deduction — route by item type ──────────────────────────────
    // Variant items (Frames) and non-variant items (Rack Posters) deducted separately
    const variantItems = verifiedItems.filter((i: any) => i.variant_id);
    const nonVariantItems = verifiedItems.filter((i: any) => !i.variant_id);

    if (variantItems.length > 0) {
      const variantStockError = await deductVariantStock(
        variantItems.map((i: any) => ({
          variant_id: i.variant_id,
          quantity: i.quantity,
          name: i.size ? `${i.name} (${i.size})` : i.name,
        }))
      );
      if (variantStockError) {
        return NextResponse.json({ success: false, message: variantStockError }, { status: 400 });
      }
    }

    if (nonVariantItems.length > 0) {
      const stockError = await deductStock(
        nonVariantItems.map((i: any) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          name: i.name,
        }))
      );
      if (stockError) {
        return NextResponse.json({ success: false, message: stockError }, { status: 400 });
      }
    }

    // ── 6. Payment signature verification ──────────────────────────────────
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const isTestMode =
      !secret ||
      secret.includes('placeholder') ||
      razorpay_order_id?.startsWith('order_test_');

    let isValid = false;

    if (!isTestMode && razorpay_signature && razorpay_order_id && razorpay_payment_id) {
      const generatedSig = crypto
        .createHmac('sha256', secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');
      isValid = crypto.timingSafeEqual(
        Buffer.from(generatedSig, 'hex'),
        Buffer.from(razorpay_signature, 'hex')
      );
    } else if (isTestMode) {
      // Allow test/demo mode orders through
      isValid = true;
    }

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Payment verification failed. Invalid signature.' },
        { status: 400 }
      );
    }

    // ── 7. Create confirmed order record ──────────────────────────────────
    const newOrder = await createOrder({
      user_id: orderData.user_id || 'demo_user_id',
      items: verifiedItems,
      subtotal: calculatedSubtotal,
      discount_amount: calculatedDiscount,
      coupon_code: orderData.coupon_code || '',
      shipping_fee: calculatedShipping,
      total: calculatedTotal,
      status: 'paid',
      razorpay_order_id,
      razorpay_payment_id: razorpay_payment_id || `pay_${Date.now()}`,
      shipping_address: orderData.shipping_address,
    });

    // ── 8. Increment coupon used_count (only after confirmed payment) ────
    if (orderData.coupon_code) {
      await incrementCouponUsageCount(orderData.coupon_code);
    }

    return NextResponse.json({
      success: true,
      orderId: newOrder.id,
      message: 'Payment verified and order created successfully.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Payment verification failed. Please contact support.' },
      { status: 500 }
    );
  }
}

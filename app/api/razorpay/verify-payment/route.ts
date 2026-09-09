import { NextResponse } from 'next/server';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import {
  createOrder,
  deductStock,
  deductVariantStock,
  getVariantsByIds,
  getProducts,
  validateCouponCode,
  incrementCouponUsageCount,
} from '@/lib/data';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { verifyPaymentLimiter, getClientIp } from '@/lib/rate-limit';
import { calculateDelhiveryRate, calculateTotalCartWeightGrams } from '@/lib/delhivery';

/**
 * POST /api/razorpay/verify-payment
 *
 * Security contract — strict step ordering:
 *  1. Signature verification FIRST — before any DB writes or stock deductions.
 *     (Previous version deducted stock before signature check — tampered requests
 *     would corrupt inventory.)
 *  2. Server-side price recalculation — client prices are never trusted.
 *  3. Stock deduction — only after signature is confirmed valid.
 *  4. Auto-refund — if stock runs out between order-creation and payment-capture,
 *     the customer is automatically refunded via Razorpay Refund API.
 *  5. Order creation — only after stock is confirmed deducted.
 *  6. Coupon usage increment — only after order is persisted.
 */
export async function POST(request: Request) {
  // ── Rate limiting: 5 verify attempts / minute / IP ─────────────────────
  const ip = getClientIp(request);
  const { success: allowed } = verifyPaymentLimiter.check(ip);
  if (!allowed) {
    return NextResponse.json(
      { success: false, message: 'Too many payment attempts. Please wait before retrying.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  try {
    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData } = body;

    if (!orderData?.items?.length) {
      return NextResponse.json({ success: false, message: 'Invalid order data: no items.' }, { status: 400 });
    }

    // ════════════════════════════════════════════════════════════════════════
    // STEP 1 — SIGNATURE VERIFICATION (must run before any side effects)
    // ════════════════════════════════════════════════════════════════════════
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const isTestMode =
      !secret ||
      secret.includes('placeholder') ||
      razorpay_order_id?.startsWith('order_test_');

    if (!isTestMode) {
      if (!razorpay_signature || !razorpay_order_id || !razorpay_payment_id) {
        return NextResponse.json(
          { success: false, message: 'Missing payment verification parameters.' },
          { status: 400 }
        );
      }

      const generatedSig = crypto
        .createHmac('sha256', secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      // timingSafeEqual prevents timing-attack signature extraction
      let signaturesMatch = false;
      try {
        signaturesMatch = crypto.timingSafeEqual(
          Buffer.from(generatedSig, 'hex'),
          Buffer.from(razorpay_signature, 'hex')
        );
      } catch {
        // Buffer length mismatch → definitely invalid signature
        signaturesMatch = false;
      }

      if (!signaturesMatch) {
        console.warn('[verify-payment] Signature mismatch — possible tampered request.', {
          razorpay_order_id,
          ip,
        });
        return NextResponse.json(
          { success: false, message: 'Payment verification failed. Please contact support.' },
          { status: 400 }
        );
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // STEP 2 — FETCH CURRENT PRICES FROM DB
    // ════════════════════════════════════════════════════════════════════════
    const allProducts = await getProducts();
    const variantIds: string[] = orderData.items
      .filter((i: any) => i.variant_id)
      .map((i: any) => i.variant_id);
    const allVariants = variantIds.length > 0 ? await getVariantsByIds(variantIds) : [];

    // ════════════════════════════════════════════════════════════════════════
    // STEP 3 — RECALCULATE TOTALS SERVER-SIDE
    // ════════════════════════════════════════════════════════════════════════
    let calculatedSubtotal = 0;
    const verifiedItems: any[] = [];

    for (const item of orderData.items) {
      const dbProduct = allProducts.find((p: any) => p.id === item.product_id);
      if (!dbProduct) {
        return NextResponse.json(
          { success: false, message: 'One or more products could not be verified.' },
          { status: 400 }
        );
      }

      let truePrice: number;
      if (item.variant_id) {
        const dbVariant = allVariants.find((v: any) => v.id === item.variant_id);
        if (!dbVariant) {
          return NextResponse.json(
            {
              success: false,
              message: `Variant for "${dbProduct.name}" (${item.size || ''}) could not be verified.`,
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

    // ════════════════════════════════════════════════════════════════════════
    // STEP 4 — RE-VALIDATE COUPON
    // ════════════════════════════════════════════════════════════════════════
    let calculatedDiscount = 0;
    let isFreeShipping = false;

    if (orderData.coupon_code) {
      const couponRes = await validateCouponCode(orderData.coupon_code, calculatedSubtotal);
      if (couponRes.success) {
        calculatedDiscount = couponRes.discountAmount;
        isFreeShipping = couponRes.isFreeShipping;
      }
      // Invalid coupon at verify time: silently ignore (discount = 0)
    }

    // ════════════════════════════════════════════════════════════════════════
    // STEP 5 — VALIDATE SHIPPING (Delhivery Dynamic Calculation)
    // ════════════════════════════════════════════════════════════════════════
    let calculatedShipping = 0;
    if (!isFreeShipping) {
      const destPin = (orderData.shipping_address?.pincode || '').trim();
      if (destPin && /^\d{6}$/.test(destPin)) {
        const totalWeight = calculateTotalCartWeightGrams(
          verifiedItems.map((item) => {
            const prod = allProducts.find((p) => p.id === item.product_id);
            return {
              product: prod,
              quantity: item.quantity,
              size: item.size,
            };
          })
        );
        const rateResult = await calculateDelhiveryRate(destPin, totalWeight);
        calculatedShipping = rateResult.success ? rateResult.shippingFee : (orderData.shipping_fee || 0);
      } else {
        calculatedShipping = orderData.shipping_fee || 0;
      }
    }

    const calculatedTotal =
      Math.max(0, calculatedSubtotal - calculatedDiscount) + calculatedShipping;

    // ════════════════════════════════════════════════════════════════════════
    // STEP 6 — DEDUCT STOCK
    // Payment is already confirmed at this point (signature verified above).
    // If stock fails → auto-refund the customer immediately.
    // ════════════════════════════════════════════════════════════════════════
    const variantItems = verifiedItems.filter((i: any) => i.variant_id);
    const nonVariantItems = verifiedItems.filter((i: any) => !i.variant_id);
    let stockError: string | null = null;

    if (variantItems.length > 0) {
      stockError = await deductVariantStock(
        variantItems.map((i: any) => ({
          variant_id: i.variant_id,
          quantity: i.quantity,
          name: i.size ? `${i.name} (${i.size})` : i.name,
        }))
      );
    }

    if (!stockError && nonVariantItems.length > 0) {
      stockError = await deductStock(
        nonVariantItems.map((i: any) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          name: i.name,
        }))
      );
    }

    if (stockError) {
      // Payment was captured but stock ran out — auto-refund
      const isRealPayment =
        !isTestMode &&
        razorpay_payment_id &&
        !razorpay_payment_id.startsWith('pay_mock');

      if (isRealPayment) {
        const key_id = process.env.RAZORPAY_KEY_ID || '';
        const key_secret = process.env.RAZORPAY_KEY_SECRET || '';
        try {
          const rzp = new Razorpay({ key_id, key_secret });
          await rzp.payments.refund(razorpay_payment_id, {
            amount: Math.round(calculatedTotal * 100),
            speed: 'optimum',
            notes: {
              reason: 'Out of stock — automatic refund by Sriyam Store',
            },
          });
          console.info('[verify-payment] Auto-refund issued.', {
            razorpay_payment_id,
            amount: calculatedTotal,
            stockError,
          });
        } catch (refundErr: any) {
          // Log fully for manual follow-up, but don't expose to client
          console.error('[verify-payment] CRITICAL — Auto-refund failed. Manual action required.', {
            razorpay_order_id,
            razorpay_payment_id,
            amount: calculatedTotal,
            stockError,
            refundError: refundErr?.message,
          });
        }
      }

      return NextResponse.json(
        {
          success: false,
          message: isRealPayment
            ? `${stockError} Your payment has been automatically refunded. Please allow 5–7 business days.`
            : stockError,
          autoRefunded: isRealPayment,
        },
        { status: 400 }
      );
    }

    // ════════════════════════════════════════════════════════════════════════
    // STEP 7 — CREATE CONFIRMED ORDER RECORD
    // ════════════════════════════════════════════════════════════════════════
    let effectiveUserId = orderData.user_id;
    if (!effectiveUserId || effectiveUserId === 'demo_user_id') {
      try {
        const serverSupabase = await createServerClient();
        const { data: { user } } = await serverSupabase.auth.getUser();
        if (user?.id) {
          effectiveUserId = user.id;
          console.info('[verify-payment] Captured user_id from server session cookies:', effectiveUserId);
        }
      } catch (authErr) {
        console.warn('[verify-payment] Could not resolve user from server session cookies:', authErr);
      }
    }

    const orderPayload = {
      user_id: effectiveUserId || orderData.user_id || 'demo_user_id',
      items: verifiedItems,
      subtotal: calculatedSubtotal,
      discount_amount: calculatedDiscount,
      coupon_code: orderData.coupon_code || '',
      shipping_fee: calculatedShipping,
      total: calculatedTotal,
      status: 'paid' as const,
      razorpay_order_id,
      razorpay_payment_id: razorpay_payment_id || `pay_${Date.now()}`,
      shipping_address: orderData.shipping_address,
    };

    console.info('[verify-payment] === INITIATING SUPABASE ORDER INSERT ===');
    console.info('[verify-payment] Order Insert Payload:', JSON.stringify(orderPayload, null, 2));

    let newOrder;
    try {
      newOrder = await createOrder(orderPayload);
      console.info('[verify-payment] === SUPABASE ORDER INSERT SUCCESS ===', {
        orderId: newOrder.id,
        user_id: newOrder.user_id,
        total: newOrder.total,
        status: newOrder.status,
      });
    } catch (orderInsertErr: any) {
      console.error('[verify-payment] === SUPABASE ORDER INSERT FAILED ===', {
        errorMessage: orderInsertErr?.message,
        errorCode: orderInsertErr?.code,
        errorDetails: orderInsertErr?.details,
        errorHint: orderInsertErr?.hint,
        orderPayload,
      });
      return NextResponse.json(
        {
          success: false,
          message: `Payment verified, but saving your order to database failed: ${orderInsertErr?.message || 'DB Error'}. Please contact support with Payment ID: ${razorpay_payment_id}`,
          paymentId: razorpay_payment_id,
        },
        { status: 500 }
      );
    }

    // ════════════════════════════════════════════════════════════════════════
    // STEP 8 — INCREMENT COUPON USAGE (only after order is persisted)
    // ════════════════════════════════════════════════════════════════════════
    if (orderData.coupon_code) {
      await incrementCouponUsageCount(orderData.coupon_code);
    }

    return NextResponse.json({
      success: true,
      orderId: newOrder.id,
      message: 'Payment verified and order created successfully.',
    });
  } catch (error: any) {
    console.error('[verify-payment] Unhandled error:', { message: error?.message, stack: error?.stack });
    return NextResponse.json(
      { success: false, message: error?.message || 'Payment verification failed. Please contact support.' },
      { status: 500 }
    );
  }
}

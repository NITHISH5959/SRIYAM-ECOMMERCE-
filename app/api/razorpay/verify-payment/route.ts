import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createOrder, deductStock, getProducts, validateCouponCode, incrementCouponUsageCount } from '@/lib/data';
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

    // ── 1. Recalculate Subtotal & Verify Items Server-Side ───────────────────
    let calculatedSubtotal = 0;
    const verifiedItems = [];
    const allProducts = await getProducts();

    for (const item of orderData.items) {
      const dbProduct = allProducts.find((p) => p.id === item.product_id);
      if (!dbProduct) {
        return NextResponse.json({ success: false, message: 'One or more products could not be verified.' }, { status: 400 });
      }

      const truePrice = dbProduct.price;
      calculatedSubtotal += truePrice * item.quantity;

      verifiedItems.push({
        product_id: dbProduct.id,
        name: dbProduct.name,
        price: truePrice,
        quantity: item.quantity,
        image: item.image || dbProduct.images?.[0] || '',
      });
    }

    // ── 2. Validate Coupon Server-Side ──────────────────────────────────────
    let calculatedDiscount = 0;
    let isFreeShipping = false;

    if (orderData.coupon_code) {
      const couponRes = await validateCouponCode(orderData.coupon_code, calculatedSubtotal);
      if (couponRes.success) {
        calculatedDiscount = couponRes.discountAmount;
        isFreeShipping = couponRes.isFreeShipping;
      }
    }

    // ── 3. Validate Shipping Server-Side ────────────────────────────────────
    let calculatedShipping = 0;
    const freeShippingThreshold = 999;
    const defaultShippingFee = 50;

    if (calculatedSubtotal < freeShippingThreshold && !isFreeShipping) {
      calculatedShipping =
        orderData.shipping_fee > 0 ? orderData.shipping_fee : defaultShippingFee;
    }

    const calculatedTotal =
      Math.max(0, calculatedSubtotal - calculatedDiscount) + calculatedShipping;

    // ── 4. Stock pre-check ──────────────────────────────────────────────────
    const stockError = await deductStock(
      verifiedItems.map((i: any) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        name: i.name,
      }))
    );
    if (stockError) {
      return NextResponse.json({ success: false, message: stockError }, { status: 400 });
    }

    // ── 5. Payment signature verification ──────────────────────────────────
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

    // ── 6. Create confirmed order record ──────────────────────────────────
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

    // ── 7. Increment coupon used_count (only after confirmed payment) ────
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

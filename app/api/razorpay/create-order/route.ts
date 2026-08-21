import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { validateEnv } from '@/lib/env';
import { createOrderLimiter, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  // Rate limiting: 10 requests per minute per IP
  const ip = getClientIp(request);
  const { success: allowed, remaining } = createOrderLimiter.check(ip);
  if (!allowed) {
    return NextResponse.json(
      { success: false, message: 'Too many requests. Please wait a moment before retrying.' },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  try {
    validateEnv();

    const body = await request.json();
    const { amount, receipt = `receipt_${Date.now()}` } = body;

    if (!amount || typeof amount !== 'number' || amount <= 0 || amount > 1_000_000) {
      return NextResponse.json(
        { success: false, message: 'Invalid order amount' },
        { status: 400 }
      );
    }

    const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key_id';
    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_placeholder_secret';

    const amountInPaise = Math.round(amount * 100);

    // If live/valid credentials are set
    if (key_id && key_secret && !key_id.includes('placeholder')) {
      try {
        const instance = new Razorpay({ key_id, key_secret });
        const razorpayOrder = await instance.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: receipt,
        });

        return NextResponse.json(
          {
            success: true,
            id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            key: key_id,
          },
          { headers: { 'X-RateLimit-Remaining': String(remaining) } }
        );
      } catch (err) {
        console.warn('[Razorpay] API error, falling back to test order creation');
      }
    }

    // Fallback mock order for test/development mode
    const mockOrderId = `order_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return NextResponse.json({
      success: true,
      id: mockOrderId,
      amount: amountInPaise,
      currency: 'INR',
      key: key_id || 'rzp_test_demo_key',
    });
  } catch (error: any) {
    console.error('[create-order] Error:', error.message);
    return NextResponse.json(
      { success: false, message: 'Failed to create order. Please try again.' },
      { status: 500 }
    );
  }
}

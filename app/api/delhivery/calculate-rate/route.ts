import { NextResponse } from 'next/server';
import { calculateDelhiveryRate, calculateTotalCartWeightGrams } from '@/lib/delhivery';
import { getClientIp, createOrderLimiter } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    // Lightweight rate limit check (reuse limiter or allow normal traffic)
    const body = await request.json();
    const { destination_pincode, weight_grams, items } = body;

    if (!destination_pincode || typeof destination_pincode !== 'string') {
      return NextResponse.json(
        {
          success: false,
          shippingFee: 0,
          isServiceable: false,
          error: 'Destination pincode is required.',
        },
        { status: 400 }
      );
    }

    const cleanPin = destination_pincode.trim();
    if (!/^\d{6}$/.test(cleanPin)) {
      return NextResponse.json(
        {
          success: false,
          shippingFee: 0,
          isServiceable: false,
          error: 'Please enter a valid 6-digit delivery pincode.',
        },
        { status: 400 }
      );
    }

    // Calculate weight: use explicit weight_grams or compute from cart items
    let effectiveWeight = typeof weight_grams === 'number' && weight_grams > 0 ? weight_grams : 0;
    if (!effectiveWeight && Array.isArray(items) && items.length > 0) {
      effectiveWeight = calculateTotalCartWeightGrams(items);
    }
    if (!effectiveWeight || effectiveWeight <= 0) {
      effectiveWeight = 300; // Default fallback for 1 frame
    }

    const result = await calculateDelhiveryRate(cleanPin, effectiveWeight);

    return NextResponse.json({
      success: result.success,
      shippingFee: result.shippingFee,
      isServiceable: result.isServiceable,
      error: result.error,
      estimatedDays: result.estimatedDays,
      isMock: result.isMock,
      weightGrams: effectiveWeight,
    });
  } catch (error: any) {
    console.error('[Delhivery Rate Route Error]', error?.message || error);
    return NextResponse.json(
      {
        success: false,
        shippingFee: 0,
        isServiceable: false,
        error: 'Unable to calculate shipping cost. Please try again.',
      },
      { status: 500 }
    );
  }
}

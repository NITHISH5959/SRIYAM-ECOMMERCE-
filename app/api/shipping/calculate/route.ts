import { NextResponse } from 'next/server';
import { shippingCalculateLimiter, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  // Rate limiting: 20 requests per minute per IP
  const ip = getClientIp(request);
  const { success: allowed } = shippingCalculateLimiter.check(ip);
  if (!allowed) {
    return NextResponse.json(
      { success: false, message: 'Too many requests. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  try {
    const body = await request.json();
    const {
      weightGrams = 300,
      pincode = '600001',
    }: { weightGrams: number; pincode: string } = body;

    // Basic input validation
    if (typeof weightGrams !== 'number' || weightGrams <= 0 || weightGrams > 50000) {
      return NextResponse.json(
        { success: false, message: 'Invalid weight parameter' },
        { status: 400 }
      );
    }
    if (typeof pincode !== 'string' || !/^\d{6}$/.test(pincode)) {
      return NextResponse.json(
        { success: false, message: 'Invalid pincode — must be 6 digits' },
        { status: 400 }
      );
    }

    const email = process.env.SHIPROCKET_EMAIL;
    const password = process.env.SHIPROCKET_PASSWORD;

    // Check if live Shiprocket credentials exist
    if (
      email &&
      password &&
      email !== 'shipping@sriyamstore.com' &&
      password !== 'shiprocket_password_placeholder'
    ) {
      try {
        const authRes = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (authRes.ok) {
          const authData = await authRes.json();
          const token = authData.token;

          const rateRes = await fetch(
            `https://apiv2.shiprocket.in/v1/external/courier/serviceability/?pickup_postcode=600004&delivery_postcode=${pincode}&weight=${(weightGrams / 1000).toFixed(2)}&cod=0`,
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (rateRes.ok) {
            const rateData = await rateRes.json();
            const recommendedCourier = rateData?.data?.available_courier_companies?.[0];
            if (recommendedCourier) {
              return NextResponse.json({
                success: true,
                shippingFee: Math.round(recommendedCourier.rate),
                totalWeightGrams: weightGrams,
                estimatedDays: recommendedCourier.etd || 3,
                courierName: recommendedCourier.courier_name,
                source: 'shiprocket_live',
              });
            }
          }
        }
      } catch {
        // Silently fall through to weight engine fallback
      }
    }

    // Dynamic Weight Rate Engine (Fallback / Default)
    let calculatedFee = 50;
    if (weightGrams >= 500 && weightGrams < 1000) {
      calculatedFee = 80;
    } else if (weightGrams >= 1000) {
      calculatedFee = 120;
    }

    const isLocalTamilNadu = pincode.startsWith('6');
    if (!isLocalTamilNadu) {
      calculatedFee += 30;
    }

    return NextResponse.json({
      success: true,
      shippingFee: calculatedFee,
      totalWeightGrams: weightGrams,
      estimatedDays: isLocalTamilNadu ? 2 : 4,
      courierName: 'Shiprocket Express Courier',
      source: 'weight_engine_fallback',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Shipping calculation failed' },
      { status: 500 }
    );
  }
}

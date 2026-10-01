import { NextResponse } from 'next/server';
import { getOrderById } from '@/lib/data';
import { trackOrderLimiter, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { success: allowed } = trackOrderLimiter.check(ip);
  if (!allowed) {
    return NextResponse.json(
      { success: false, message: 'Too many tracking attempts. Please wait a minute before retrying.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  try {
    const body = await request.json();
    const { orderId, contact } = body;

    if (!orderId || typeof orderId !== 'string' || !orderId.trim()) {
      return NextResponse.json(
        { success: false, message: 'Please provide a valid Order ID (e.g. SRI001).' },
        { status: 400 }
      );
    }

    if (!contact || typeof contact !== 'string' || !contact.trim()) {
      return NextResponse.json(
        { success: false, message: 'Please provide the email or 10-digit mobile number used at checkout.' },
        { status: 400 }
      );
    }

    const cleanOrderId = orderId.trim();
    const cleanContact = contact.trim().toLowerCase();
    const contactDigits = cleanContact.replace(/\D/g, '');

    const order = await getOrderById(cleanOrderId);

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: 'No order found matching the provided Order ID and contact details.',
        },
        { status: 404 }
      );
    }

    // Verify contact info against order data
    const orderEmail = (order.contact_email || (order.shipping_address as any)?.email || '').toLowerCase().trim();
    const orderPhone = (order.shipping_address?.phone || '').replace(/\D/g, '');

    let matches = false;

    // Check email match (if email provided)
    if (cleanContact.includes('@') && orderEmail && orderEmail === cleanContact) {
      matches = true;
    }

    // Check phone match (if 10-digit phone provided)
    if (contactDigits.length >= 10 && orderPhone) {
      const orderPhoneLast10 = orderPhone.slice(-10);
      const inputPhoneLast10 = contactDigits.slice(-10);
      if (orderPhoneLast10 === inputPhoneLast10) {
        matches = true;
      }
    }

    // Allow lookup if contact matches either email or phone directly
    if (orderPhone && orderPhone.includes(contactDigits) && contactDigits.length >= 6) {
      matches = true;
    }

    if (!matches) {
      return NextResponse.json(
        {
          success: false,
          message: 'The email or phone number does not match this Order ID. Please check and try again.',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error: any) {
    console.error('[/api/orders/track error]', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to track order.' },
      { status: 500 }
    );
  }
}

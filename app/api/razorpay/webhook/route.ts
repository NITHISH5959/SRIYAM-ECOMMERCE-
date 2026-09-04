import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { updateOrderStatus, getOrderByRazorpayOrderId } from '@/lib/data';

/**
 * Razorpay Webhook Endpoint
 *
 * Validates the incoming webhook signature using RAZORPAY_WEBHOOK_SECRET.
 * Handles payment.captured events to mark orders as paid.
 *
 * Set up in Razorpay Dashboard → Settings → Webhooks:
 *   URL: https://yourdomain.com/api/razorpay/webhook
 *   Events: payment.captured, payment.failed
 *   Secret: value of RAZORPAY_WEBHOOK_SECRET env var
 */
export async function POST(request: Request) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[Webhook] RAZORPAY_WEBHOOK_SECRET is not set. Rejecting all webhook requests.');
    return NextResponse.json(
      { success: false, message: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  // Read the raw body for signature verification
  const rawBody = await request.text();
  const receivedSignature = request.headers.get('x-razorpay-signature');

  if (!receivedSignature) {
    return NextResponse.json(
      { success: false, message: 'Missing webhook signature header' },
      { status: 400 }
    );
  }

  // HMAC-SHA256 signature verification
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  const isValid = crypto.timingSafeEqual(
    Buffer.from(receivedSignature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );

  if (!isValid) {
    console.warn('[Webhook] Invalid signature — possible spoofed request rejected.');
    return NextResponse.json(
      { success: false, message: 'Invalid webhook signature' },
      { status: 400 }
    );
  }

  // Parse the verified payload
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON payload' }, { status: 400 });
  }

  const event = payload?.event;
  const paymentEntity = payload?.payload?.payment?.entity;

  try {
    switch (event) {
      case 'payment.captured': {
        // Payment was successful — mark order as paid in the database
        const razorpayOrderId = paymentEntity?.order_id;
        if (razorpayOrderId) {
          const order = await getOrderByRazorpayOrderId(razorpayOrderId);
          if (order) {
            await updateOrderStatus(order.id, 'paid');
            console.info(`[Webhook] payment.captured — Order ${order.id} marked as paid (Razorpay: ${razorpayOrderId})`);
          } else {
            console.warn(`[Webhook] payment.captured — No order found for Razorpay order ID: ${razorpayOrderId}`);
          }
        }
        break;
      }

      case 'payment.failed': {
        const razorpayOrderId = paymentEntity?.order_id;
        console.warn(`[Webhook] payment.failed for Razorpay order: ${razorpayOrderId}`);
        break;
      }

      case 'refund.created': {
        console.info('[Webhook] refund.created event received');
        break;
      }

      default:
        // Unknown events are acknowledged but not acted upon
        break;
    }
  } catch (err) {
    console.error('[Webhook] Error processing webhook event:', err);
    // Return 200 to prevent Razorpay from retrying — log internally
    return NextResponse.json({ success: true, message: 'Event received with processing error' });
  }

  // Always return 200 to acknowledge receipt
  return NextResponse.json({ success: true, message: `Event ${event} acknowledged` });
}

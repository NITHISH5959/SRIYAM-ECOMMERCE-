import { NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  updateOrderStatus,
  getOrderByRazorpayOrderId,
  createOrder,
  deductStock,
  deductVariantStock,
  getVariantsByIds,
  getProducts,
  validateCouponCode,
  incrementCouponUsageCount,
} from '@/lib/data';
import { sendOrderConfirmationEmail } from '@/lib/email';

/**
 * Razorpay Webhook Endpoint — POST /api/razorpay/webhook
 *
 * Primary responsibility: backup confirmation for payment.captured events.
 * This fires when the browser closes before verify-payment completes.
 *
 * Security: HMAC-SHA256 signature verified against RAZORPAY_WEBHOOK_SECRET
 * before any payload is trusted.
 *
 * Razorpay Dashboard setup:
 *   URL: https://yourdomain.com/api/razorpay/webhook
 *   Events: payment.captured, payment.failed, refund.created
 *   Secret: value of RAZORPAY_WEBHOOK_SECRET env var
 */
export async function POST(request: Request) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret || webhookSecret.includes('placeholder')) {
    console.error('[Webhook] RAZORPAY_WEBHOOK_SECRET is not set or is a placeholder. Rejecting all requests.');
    return NextResponse.json(
      { success: false, message: 'Webhook not configured.' },
      { status: 500 }
    );
  }

  // ── Signature verification ─────────────────────────────────────────────
  const rawBody = await request.text();
  const receivedSignature = request.headers.get('x-razorpay-signature');

  if (!receivedSignature) {
    return NextResponse.json({ success: false, message: 'Missing webhook signature.' }, { status: 400 });
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  let signatureValid = false;
  try {
    signatureValid = crypto.timingSafeEqual(
      Buffer.from(receivedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    signatureValid = false;
  }

  if (!signatureValid) {
    console.warn('[Webhook] Invalid signature — possible spoofed request rejected.');
    return NextResponse.json({ success: false, message: 'Invalid webhook signature.' }, { status: 400 });
  }

  // ── Parse payload ──────────────────────────────────────────────────────
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON payload.' }, { status: 400 });
  }

  const event = payload?.event;
  const paymentEntity = payload?.payload?.payment?.entity;

  try {
    switch (event) {
      case 'payment.captured': {
        const razorpayOrderId = paymentEntity?.order_id;
        const razorpayPaymentId = paymentEntity?.id;

        if (!razorpayOrderId) {
          console.warn('[Webhook] payment.captured received without order_id.');
          break;
        }

        const existingOrder = await getOrderByRazorpayOrderId(razorpayOrderId);

        if (existingOrder) {
          // verify-payment already created the order — just ensure status is 'paid'
          if (existingOrder.status !== 'paid') {
            await updateOrderStatus(existingOrder.id, 'paid');
            console.info('[Webhook] payment.captured — Order updated to paid.', {
              orderId: existingOrder.id,
              razorpayOrderId,
            });
          } else {
            console.info('[Webhook] payment.captured — Order already paid, no-op.', {
              orderId: existingOrder.id,
            });
          }
        } else {
          // verify-payment never ran (browser closed after payment)
          // Attempt fallback order creation from Razorpay order notes
          console.warn('[Webhook] payment.captured — No order found. Attempting fallback creation.', {
            razorpayOrderId,
          });

          const notes: Record<string, string> = paymentEntity?.notes || {};
          const paymentEmail = paymentEntity?.email || '';
          await createOrderFromNotes(razorpayOrderId, razorpayPaymentId, notes, paymentEmail);
        }
        break;
      }

      case 'payment.failed': {
        console.warn('[Webhook] payment.failed.', {
          razorpayOrderId: paymentEntity?.order_id,
          errorReason: paymentEntity?.error_reason,
          errorDescription: paymentEntity?.error_description,
        });
        // No side effects — no order row created, no stock touched
        break;
      }

      case 'refund.created': {
        console.info('[Webhook] refund.created.', {
          refundId: paymentEntity?.id,
          amount: paymentEntity?.amount,
        });
        break;
      }

      default:
        // Unrecognised events are acknowledged but not acted on
        console.info(`[Webhook] Unhandled event type: ${event}`);
        break;
    }
  } catch (err: any) {
    console.error('[Webhook] Error processing event.', { event, error: err?.message });
    // Return 200 so Razorpay does NOT retry — we log internally
    return NextResponse.json({ success: true, message: 'Event received with processing error.' });
  }

  // Always 200 to acknowledge receipt (Razorpay retries on non-2xx)
  return NextResponse.json({ success: true, message: `Event ${event} acknowledged.` });
}

/**
 * Fallback order creation from Razorpay order notes.
 *
 * Called when payment.captured fires but verify-payment never completed
 * (customer paid then immediately closed browser / lost connectivity).
 *
 * Notes format stored by create-order:
 *   user_id, coupon, subtotal, discount, shipping, total,
 *   items: "product_id~variant_id~size~qty|..."
 */
async function createOrderFromNotes(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  notes: Record<string, string>,
  paymentEmail?: string
): Promise<void> {
  const { user_id, coupon, subtotal, discount, shipping, total, items: compactItems } = notes;

  if (!user_id) {
    console.error('[Webhook] Fallback failed — no user_id in notes.', { razorpayOrderId, notes });
    return;
  }

  if (!compactItems) {
    console.error('[Webhook] Fallback failed — no items in notes.', { razorpayOrderId });
    return;
  }

  // Parse "product_id~variant_id~size~qty|..." format
  const parsedItems = compactItems
    .split('|')
    .map((s) => {
      const [product_id, variant_id, size, qty] = s.split('~');
      return {
        product_id: product_id || '',
        variant_id: variant_id || undefined,
        size: size || undefined,
        quantity: parseInt(qty || '1', 10),
      };
    })
    .filter((i) => i.product_id && i.quantity > 0);

  if (parsedItems.length === 0) {
    console.error('[Webhook] Fallback failed — could not parse items from notes.', {
      razorpayOrderId,
      compactItems,
    });
    return;
  }

  // Fetch live prices (same logic as verify-payment)
  const allProducts = await getProducts();
  const variantIds = parsedItems.filter((i) => i.variant_id).map((i) => i.variant_id as string);
  const allVariants = variantIds.length > 0 ? await getVariantsByIds(variantIds) : [];

  const verifiedItems: any[] = [];

  for (const item of parsedItems) {
    const dbProduct = allProducts.find((p) => p.id === item.product_id);
    if (!dbProduct) {
      console.warn('[Webhook] Fallback — product not found, skipping.', { product_id: item.product_id });
      continue;
    }

    let truePrice = dbProduct.price;
    if (item.variant_id) {
      const dbVariant = allVariants.find((v) => v.id === item.variant_id);
      if (dbVariant) truePrice = dbVariant.price;
    }

    verifiedItems.push({
      product_id: dbProduct.id,
      name: dbProduct.name,
      price: truePrice,
      quantity: item.quantity,
      image: dbProduct.images?.[0] || '',
      ...(item.variant_id ? { variant_id: item.variant_id } : {}),
      ...(item.size ? { size: item.size } : {}),
    });
  }

  if (verifiedItems.length === 0) {
    console.error('[Webhook] Fallback failed — no verifiable items found.', { razorpayOrderId });
    return;
  }

  // ── Deduct stock ──────────────────────────────────────────────────────
  const variantItems = verifiedItems.filter((i) => i.variant_id);
  const nonVariantItems = verifiedItems.filter((i) => !i.variant_id);

  if (variantItems.length > 0) {
    const err = await deductVariantStock(
      variantItems.map((i) => ({ variant_id: i.variant_id, quantity: i.quantity, name: i.name }))
    );
    if (err) {
      console.error('[Webhook] Fallback — variant stock deduction failed.', { razorpayOrderId, err });
      return;
    }
  }

  if (nonVariantItems.length > 0) {
    const err = await deductStock(
      nonVariantItems.map((i) => ({ product_id: i.product_id, quantity: i.quantity, name: i.name }))
    );
    if (err) {
      console.error('[Webhook] Fallback — stock deduction failed.', { razorpayOrderId, err });
      return;
    }
  }

  // ── Create order ──────────────────────────────────────────────────────
  const storedTotal = parseFloat(total || '0');
  const storedSubtotal = parseFloat(subtotal || '0');
  const storedDiscount = parseFloat(discount || '0');
  const storedShipping = parseFloat(shipping || '0');
  const couponCode = coupon || '';

  const contactEmail = (notes.contact_email || notes.cust_email || paymentEmail || '').trim();

  const fallbackAddress = {
    id: notes.address_id || `addr_${Date.now()}`,
    user_id: user_id || 'guest',
    name: notes.cust_name || 'Customer',
    phone: notes.cust_phone || '',
    email: contactEmail || '',
    line1: notes.cust_line1 || 'Address not specified via webhook fallback',
    line2: notes.cust_line2 || '',
    city: notes.cust_city || 'City',
    state: notes.cust_state || 'Tamil Nadu',
    pincode: notes.cust_pincode || '000000',
    is_default: false,
  };

  const newOrder = await createOrder({
    user_id,
    contact_email: contactEmail || null,
    items: verifiedItems,
    subtotal: storedSubtotal,
    discount_amount: storedDiscount,
    coupon_code: couponCode,
    shipping_fee: storedShipping,
    total: storedTotal,
    status: 'paid',
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    shipping_address: fallbackAddress as any,
  });

  if (couponCode) {
    await incrementCouponUsageCount(couponCode);
  }

  // Send confirmation email
  sendOrderConfirmationEmail(newOrder).catch((err) =>
    console.warn('[Webhook] Failed to send fallback confirmation email:', err)
  );

  console.info('[Webhook] Fallback order created successfully.', {
    razorpayOrderId,
    razorpayPaymentId,
    orderNumber: newOrder.order_number,
    total: storedTotal,
    itemCount: verifiedItems.length,
  });
}

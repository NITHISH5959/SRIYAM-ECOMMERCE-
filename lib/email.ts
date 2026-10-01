import { Order } from '@/types';
import { STORE_CONFIG } from '@/lib/config';

/**
 * Generates an HTML order confirmation email for Sriyam Store customers.
 */
export function generateOrderConfirmationHtml(order: Order, storeUrl = 'https://sriyam.in'): string {
  const displayId = order.order_number || order.id;
  const contact = order.contact_email || (order.shipping_address as any)?.email || order.shipping_address?.phone || '';
  const trackingLink = `${storeUrl}/track-order?orderId=${encodeURIComponent(displayId)}&contact=${encodeURIComponent(contact)}`;
  
  const itemSummary = order.items.map(i => `${i.name}${i.size ? ` (${i.size})` : ''} x${i.quantity}`).join(', ');
  const whatsappUrl = `https://wa.me/${STORE_CONFIG.whatsappNumber.replace(/\+/g, '')}?text=${encodeURIComponent(
    `Hi Sriyam Store, I have an inquiry about my order ${displayId} (${itemSummary}).`
  )}`;

  const itemsRowsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #f4f4f5;">
          <div style="font-weight: 600; font-size: 14px; color: #18181b;">${item.name}</div>
          ${item.size ? `<div style="font-size: 12px; color: #71717a; margin-top: 2px;">Size: ${item.size}</div>` : ''}
          <div style="font-size: 12px; color: #a1a1aa; margin-top: 2px;">Qty: ${item.quantity}</div>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #f4f4f5; text-align: right; font-weight: 600; font-size: 14px; color: #18181b;">
          ₹${(item.price * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </td>
      </tr>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - ${displayId}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #18181b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fafafa; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #18181b; padding: 28px 24px; text-align: center;">
              <h1 style="margin: 0; font-family: Georgia, serif; font-size: 24px; color: #ffffff; letter-spacing: 0.5px;">
                ${STORE_CONFIG.name}
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #f59e0b;">
                Bringing Divinity to Every Home
              </p>
            </td>
          </tr>

          <!-- Banner -->
          <tr>
            <td style="padding: 32px 24px 20px 24px; text-align: center;">
              <div style="display: inline-block; background-color: #ecfdf5; color: #047857; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 6px 14px; border-radius: 9999px; border: 1px solid #a7f3d0; margin-bottom: 12px;">
                ✓ Payment Verified &amp; Confirmed
              </div>
              <h2 style="margin: 0 0 8px 0; font-family: Georgia, serif; font-size: 22px; color: #18181b;">
                Thank You for Your Order!
              </h2>
              <p style="margin: 0; font-size: 13px; color: #71717a;">
                We have received your payment. Your sacred art order is being carefully prepared for express dispatch.
              </p>
            </td>
          </tr>

          <!-- Order Reference Box -->
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; text-align: center;">
                <span style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Order ID</span>
                <div style="font-size: 20px; font-family: monospace; font-weight: 700; color: #0f172a; margin-top: 4px;">
                  ${displayId}
                </div>
              </div>
            </td>
          </tr>

          <!-- Items Ordered Table -->
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <h3 style="margin: 0 0 12px 0; font-family: Georgia, serif; font-size: 16px; color: #18181b; border-bottom: 1px solid #e4e4e7; padding-bottom: 8px;">
                Items in Your Order
              </h3>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                ${itemsRowsHtml}
              </table>

              <!-- Totals -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 16px; font-size: 13px;">
                <tr>
                  <td style="padding: 4px 0; color: #71717a;">Subtotal</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #18181b;">
                    ₹${order.subtotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                ${
                  (order.discount_amount || 0) > 0
                    ? `
                <tr>
                  <td style="padding: 4px 0; color: #047857;">Coupon Discount ${order.coupon_code ? `(${order.coupon_code})` : ''}</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #047857;">
                    -₹${order.discount_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>`
                    : ''
                }
                <tr>
                  <td style="padding: 4px 0; color: #71717a;">Shipping Fee</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #18181b;">
                    ${order.shipping_fee === 0 ? '<span style="color:#047857; font-weight:700;">FREE</span>' : `₹${order.shipping_fee?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                  </td>
                </tr>
                <tr style="border-top: 1px solid #e4e4e7;">
                  <td style="padding: 12px 0 0 0; font-size: 15px; font-weight: 700; color: #18181b;">Total Paid</td>
                  <td style="padding: 12px 0 0 0; text-align: right; font-size: 18px; font-weight: 700; color: #92400e;">
                    ₹${order.total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Delivery Address -->
          ${
            order.shipping_address?.name
              ? `
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <h3 style="margin: 0 0 10px 0; font-family: Georgia, serif; font-size: 16px; color: #18181b; border-bottom: 1px solid #e4e4e7; padding-bottom: 8px;">
                Shipping Address
              </h3>
              <div style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 10px; padding: 14px; font-size: 12px; line-height: 1.6; color: #52525b;">
                <strong style="color: #18181b;">${order.shipping_address.name}</strong> (${order.shipping_address.phone})<br>
                ${order.shipping_address.line1}${order.shipping_address.line2 ? `, ${order.shipping_address.line2}` : ''}<br>
                ${order.shipping_address.city}, ${order.shipping_address.state} – <span style="font-family: monospace; font-weight: 700; color: #18181b;">${order.shipping_address.pincode}</span>
              </div>
            </td>
          </tr>`
              : ''
          }

          <!-- Tracking & WhatsApp CTAs -->
          <tr>
            <td style="padding: 0 24px 30px 24px; text-align: center;">
              <div style="margin-bottom: 14px;">
                <a href="${trackingLink}" style="display: block; background-color: #18181b; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 14px 24px; border-radius: 10px;">
                  Track Your Order Online →
                </a>
              </div>
              <div>
                <a href="${whatsappUrl}" style="display: block; background-color: #059669; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 12px 24px; border-radius: 10px;">
                  Chat with Us on WhatsApp
                </a>
              </div>
              <p style="margin: 16px 0 0 0; font-size: 11px; color: #a1a1aa;">
                Have questions? Reach us anytime at <a href="mailto:${STORE_CONFIG.contact.email}" style="color: #92400e;">${STORE_CONFIG.contact.email}</a> or +91 97893 54378.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f4f4f5; padding: 20px 24px; text-align: center; font-size: 11px; color: #71717a; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0;">© ${new Date().getFullYear()} ${STORE_CONFIG.name}. All rights reserved.</p>
              <p style="margin: 4px 0 0 0; color: #b45309; font-weight: 500;">நற்றுணையாவது நமச்சிவாயவே</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Sends order confirmation email to the customer.
 * Gracefully logs and succeeds even if an external SMTP/email provider is not configured.
 */
export async function sendOrderConfirmationEmail(order: Order): Promise<{ success: boolean; error?: string }> {
  const customerEmail = (order.contact_email || (order.shipping_address as any)?.email || (order as any).customer_email || '').trim();
  const displayId = order.order_number || order.id;

  if (!customerEmail || !customerEmail.includes('@')) {
    console.info(`[Email Service] No customer email provided for order ${displayId}. Skipping email send.`);
    return { success: true };
  }

  const htmlContent = generateOrderConfirmationHtml(order);

  try {
    // If an external email provider key (e.g. RESEND_API_KEY) is configured:
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey && !resendApiKey.includes('placeholder')) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: `${STORE_CONFIG.name} <orders@sriyam.in>`,
          to: [customerEmail],
          subject: `Order Confirmed: ${displayId} — Sriyam Store`,
          html: htmlContent,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        console.warn('[Email Service] Resend API response error:', errorData);
        return { success: false, error: errorData?.message || 'Failed to send email via Resend' };
      }

      console.info(`[Email Service] Successfully sent confirmation email for order ${displayId} to ${customerEmail}`);
      return { success: true };
    }

    // Default development / standard notification log
    console.info(`[Email Service] Order confirmation email prepared for ${customerEmail} (Order ${displayId}). [No external provider key set; email formatted successfully]`);
    return { success: true };
  } catch (err: any) {
    console.error(`[Email Service] Error sending order confirmation email for ${displayId}:`, err?.message);
    return { success: false, error: err?.message };
  }
}

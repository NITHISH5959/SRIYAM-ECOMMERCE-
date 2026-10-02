import { NextResponse, type NextRequest } from 'next/server';
import { checkIsAdmin } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateInvoicePdf, type InvoiceOrder } from '@/lib/invoice/generate-invoice';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  // ── 1. Admin check FIRST — before touching any order data ───────────────
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    return NextResponse.json(
      { error: 'Unauthorized. Admin access required.' },
      { status: 403 },
    );
  }

  const orderId = params.id;
  if (!orderId) {
    return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
  }

  // ── 2. Load order server-side with service role client ──────────────────
  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 },
    );
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json(
      { error: 'Order not found' },
      { status: 404 },
    );
  }

  // Only allow invoices for paid/shipped/delivered orders
  const allowedStatuses = ['paid', 'shipped', 'delivered'];
  if (!allowedStatuses.includes(order.status)) {
    return NextResponse.json(
      { error: 'Invoices are only available for paid, shipped, or delivered orders.' },
      { status: 400 },
    );
  }

  // ── 3. Generate PDF ─────────────────────────────────────────────────────
  try {
    const invoiceOrder: InvoiceOrder = {
      id: order.id,
      order_number: order.order_number || order.id,
      created_at: order.created_at,
      contact_email: order.contact_email,
      items: Array.isArray(order.items) ? order.items : [],
      subtotal: order.subtotal ?? 0,
      discount_amount: order.discount_amount ?? 0,
      coupon_code: order.coupon_code,
      shipping_fee: order.shipping_fee ?? 0,
      total: order.total ?? 0,
      status: order.status,
      razorpay_payment_id: order.razorpay_payment_id,
      shipping_address: order.shipping_address ?? {},
    };

    const pdfBytes = await generateInvoicePdf(invoiceOrder);
    const pdfBuffer = Buffer.from(pdfBytes);
    const fileName = `Invoice-${invoiceOrder.order_number}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (err: any) {
    console.error('Invoice generation error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to generate invoice' },
      { status: 500 },
    );
  }
}

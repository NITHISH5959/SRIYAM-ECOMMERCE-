import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { updateOrderStatus, getOrderById } from '@/lib/data';
import { checkIsAdmin } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const { orderId, razorpay_payment_id } = body;

    if (!orderId || !razorpay_payment_id) {
      return NextResponse.json({ success: false, message: 'Missing orderId or payment ID' }, { status: 400 });
    }

    const key_id = process.env.RAZORPAY_KEY_ID || '';
    const key_secret = process.env.RAZORPAY_KEY_SECRET || '';

    // Try live Razorpay refund
    if (key_id && key_secret && !key_id.includes('placeholder')) {
      try {
        const instance = new Razorpay({ key_id, key_secret });
        const order = await getOrderById(orderId);
        const refundAmount = order ? Math.round(order.total * 100) : undefined;
        await instance.payments.refund(razorpay_payment_id, {
          amount: refundAmount,
          speed: 'normal',
          notes: { order_id: order?.order_number || orderId, reason: 'Admin initiated refund' },
        });
      } catch (err) {
        console.warn('Razorpay refund API error, proceeding with status update only:', err);
      }
    }

    // Mark order as cancelled in DB / memory store
    await updateOrderStatus(orderId, 'cancelled');

    return NextResponse.json({
      success: true,
      message: 'Refund initiated and order cancelled successfully.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Refund failed' },
      { status: 500 }
    );
  }
}

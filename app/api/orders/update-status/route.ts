import { NextResponse } from 'next/server';
import { updateOrderStatus } from '@/lib/data';
import { checkIsAdmin } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { orderId, status } = await request.json();
    const validStatuses = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
    if (!orderId || !validStatuses.includes(status)) {
      return NextResponse.json({ success: false, message: 'Invalid order ID or status' }, { status: 400 });
    }
    await updateOrderStatus(orderId, status);
    return NextResponse.json({ success: true, message: `Order updated to ${status}` });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

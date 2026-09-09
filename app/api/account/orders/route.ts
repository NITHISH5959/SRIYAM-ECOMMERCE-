import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { memoryOrders } from '@/lib/data';
import { Order } from '@/types';

export const dynamic = 'force-dynamic';

const ORDER_SELECT_FIELDS = 'id, order_number, user_id, items, subtotal, discount_amount, coupon_code, shipping_fee, total, status, razorpay_order_id, razorpay_payment_id, shipping_address, created_at';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');

    let effectiveUserId = requestedUserId || '';

    // If Supabase is configured, check session user first
    if (isSupabaseConfigured()) {
      try {
        const serverSupabase = await createServerClient();
        const { data: { user } } = await serverSupabase.auth.getUser();
        if (user?.id) {
          effectiveUserId = user.id;
        }
      } catch (authErr) {
        console.warn('[/api/account/orders] Session check error:', authErr);
      }

      if (!effectiveUserId) {
        return NextResponse.json(
          { success: false, message: 'Unauthorized. Please log in to view your orders.', orders: [] },
          { status: 401 }
        );
      }

      const supabase = createAdminClient() || (await createServerClient());
      const { data, error } = await supabase
        .from('orders')
        .select(ORDER_SELECT_FIELDS)
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[/api/account/orders error]', error);
        return NextResponse.json(
          { success: false, message: error.message, orders: [] },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        orders: (data || []) as Order[],
      });
    }

    // In-memory demo mode fallback
    const filtered = memoryOrders
      .filter((o) => !effectiveUserId || o.user_id === effectiveUserId || o.user_id === 'demo_user_id')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({
      success: true,
      orders: filtered,
    });
  } catch (error: any) {
    console.error('[/api/account/orders catch]', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch orders', orders: [] },
      { status: 500 }
    );
  }
}

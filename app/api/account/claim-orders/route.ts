import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { claimOrdersLimiter, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function cleanPhone(rawPhone: string | null | undefined): string {
  if (!rawPhone) return '';
  const digits = String(rawPhone).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ip = getClientIp(request);
    const rateLimitKey = `${ip}:${user.id}`;
    const { success } = claimOrdersLimiter.check(rateLimitKey);

    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const userEmail = user.email.trim().toLowerCase();

    // Query profile for phone number or fall back to user_metadata
    let userPhone = (user.user_metadata?.phone || '').trim();
    let userName = (user.user_metadata?.full_name || '').trim();

    const adminSupabase = createAdminClient();
    if (!adminSupabase) {
      // In local mode without service role key, return graceful success
      return NextResponse.json({ success: true, claimedCount: 0 });
    }

    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('full_name, phone, email')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) {
      if (profile.phone && !userPhone) userPhone = profile.phone.trim();
      if (profile.full_name && !userName) userName = profile.full_name.trim();
    }

    const normalizedUserPhone = cleanPhone(userPhone);

    // Strict Double Match Requirement:
    // Both email AND a valid 10-digit phone must be present on the account.
    // If either is missing or invalid, claim nothing.
    if (!userEmail || !normalizedUserPhone || normalizedUserPhone.length < 10) {
      console.info('[claim-orders] Skipped: Account lacks a valid email or 10-digit phone number for double matching.');
      return NextResponse.json({ success: true, claimedCount: 0 });
    }

    // Find all unclaimed guest orders (user_id IS NULL)
    const { data: guestOrders, error: ordersError } = await adminSupabase
      .from('orders')
      .select('id, contact_email, shipping_address, total, created_at')
      .is('user_id', null);

    if (ordersError || !guestOrders || guestOrders.length === 0) {
      return NextResponse.json({ success: true, claimedCount: 0 });
    }

    // Double Match filter:
    // 1. lower(contact_email) == userEmail OR lower(shipping_address.email) == userEmail
    // AND
    // 2. cleanPhone(shipping_address.phone) == normalizedUserPhone
    const matchedOrders = guestOrders.filter((order) => {
      const orderContactEmail = (order.contact_email || '').trim().toLowerCase();
      const orderShippingEmail = (order.shipping_address?.email || '').trim().toLowerCase();
      const emailMatches = orderContactEmail === userEmail || orderShippingEmail === userEmail;

      const orderPhone = cleanPhone(order.shipping_address?.phone || '');
      const phoneMatches = orderPhone === normalizedUserPhone;

      return emailMatches && phoneMatches;
    });

    if (matchedOrders.length === 0) {
      return NextResponse.json({ success: true, claimedCount: 0 });
    }

    const matchedOrderIds = matchedOrders.map((o) => o.id);

    // 1. Set user_id on all matched orders
    const { error: updateError } = await adminSupabase
      .from('orders')
      .update({ user_id: user.id })
      .in('id', matchedOrderIds);

    if (updateError) {
      console.error('[claim-orders] Error linking orders to user:', updateError);
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    console.info(`[claim-orders] Successfully claimed ${matchedOrderIds.length} guest order(s) for user ${user.id}`);

    // 2. Ingest shipping addresses into the addresses table for this user (deduplicated)
    try {
      const { data: existingAddresses } = await adminSupabase
        .from('addresses')
        .select('line1, pincode, phone')
        .eq('user_id', user.id);

      const existingSet = new Set(
        (existingAddresses || []).map(
          (a) => `${(a.line1 || '').trim().toLowerCase()}_${(a.pincode || '').trim()}_${cleanPhone(a.phone)}`
        )
      );

      const newAddressesToInsert: any[] = [];

      for (const order of matchedOrders) {
        const addr = order.shipping_address;
        if (!addr || !addr.line1 || !addr.pincode) continue;

        const addrPhone = cleanPhone(addr.phone || userPhone);
        const dedupeKey = `${addr.line1.trim().toLowerCase()}_${(addr.pincode || '').trim()}_${addrPhone}`;

        if (!existingSet.has(dedupeKey)) {
          existingSet.add(dedupeKey);
          newAddressesToInsert.push({
            user_id: user.id,
            name: addr.name || userName || 'Delivery Address',
            phone: addr.phone || userPhone,
            email: userEmail,
            line1: addr.line1,
            line2: addr.line2 || null,
            city: addr.city || '',
            state: addr.state || '',
            pincode: addr.pincode,
            is_default: existingAddresses?.length === 0 && newAddressesToInsert.length === 0,
          });
        }
      }

      if (newAddressesToInsert.length > 0) {
        await adminSupabase.from('addresses').insert(newAddressesToInsert);
      }
    } catch (addrErr) {
      console.warn('[claim-orders] Address ingestion warning:', addrErr);
    }

    // 3. Update profile details if missing (without overwriting existing values or touching is_admin)
    try {
      const profileUpdates: Record<string, any> = {};
      if (!profile?.email) profileUpdates.email = userEmail;
      if (!profile?.full_name && userName) profileUpdates.full_name = userName;
      if (!profile?.phone && userPhone) profileUpdates.phone = userPhone;

      if (Object.keys(profileUpdates).length > 0) {
        await adminSupabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', user.id);
      }
    } catch (profErr) {
      console.warn('[claim-orders] Profile update warning:', profErr);
    }

    return NextResponse.json({
      success: true,
      claimedCount: matchedOrderIds.length,
    });
  } catch (err: any) {
    console.error('[claim-orders fatal error]', err);
    // Never fail login or signup due to claim error
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal claim error' },
      { status: 500 }
    );
  }
}

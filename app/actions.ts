'use server';

import { revalidatePath } from 'next/cache';
import { checkIsAdmin } from '@/lib/supabase/server';

/**
 * Triggers Next.js cache revalidation for storefront routes that consume
 * product, category, or coupon data. This ensures admin changes are reflected
 * instantly without waiting for ISR intervals.
 *
 * Guarded by a server-side is_admin check so this action cannot be called
 * directly by non-admin users to perform cache-flood attacks.
 */
export async function revalidateStorefront() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    console.warn('[revalidateStorefront] Unauthorized call rejected.');
    return;
  }

  try {
    // Revalidate storefront views
    revalidatePath('/');
    revalidatePath('/shop');
    revalidatePath('/product/[slug]', 'layout');
    revalidatePath('/product/[slug]', 'page');
  } catch (error) {
    console.error('Failed to revalidate cache paths:', error);
  }
}

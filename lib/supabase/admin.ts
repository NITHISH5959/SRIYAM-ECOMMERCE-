import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client powered by the service_role key.
 * Bypasses RLS for trusted server-side admin operations.
 * MUST ALWAYS be guarded by a server-side checkIsAdmin() call!
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!url || !serviceKey || serviceKey.includes('placeholder')) {
    return null;
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

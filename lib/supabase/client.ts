import { createBrowserClient } from '@supabase/ssr';

/**
 * Returns true only when real (non-placeholder) Supabase credentials are set.
 * This is a synchronous, zero-cost check — no network call.
 * Use at the top of every data-fetch function to skip Supabase entirely
 * when running in local/demo mode, preventing the 15+ second connection timeout.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return (
    url.length > 0 &&
    key.length > 0 &&
    !url.includes('your-supabase-project-id') &&
    !key.includes('placeholder')
  );
}

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

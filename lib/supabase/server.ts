import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
    }
  );
}

export { createClient as createServerClient };

import { isSupabaseConfigured } from './client';

/**
 * Server-side security helper to verify if the request comes from an authenticated admin.
 * Automatically falls back to allowing actions if we are running in local demo / placeholder mode.
 */
export async function checkIsAdmin(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return true;
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return false;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return false;
    }

    return profile?.is_admin === true;
  } catch (error) {
    console.error('Error verifying admin authorization server-side:', error);
    return false;
  }
}

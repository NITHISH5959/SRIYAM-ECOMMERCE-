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

/**
 * Server-side security helper to verify if the request comes from an authenticated admin.
 * Automatically falls back to allowing actions if we are running in local demo / placeholder mode.
 */
export async function checkIsAdmin(): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // In development with placeholder credentials, bypass auth to allow local testing.
  // In production this block is NEVER entered — real Supabase auth is always enforced.
  const isDemoMode =
    process.env.NODE_ENV === 'development' &&
    (!supabaseUrl ||
      supabaseUrl.includes('your-supabase-project-id') ||
      supabaseAnonKey.includes('placeholder'));

  if (isDemoMode) {
    return true; // Bypass validation in local demo environment (dev only)
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return false;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    return profile?.is_admin === true;
  } catch (error) {
    console.error('Error verifying admin authorization server-side:', error);
    return false;
  }
}

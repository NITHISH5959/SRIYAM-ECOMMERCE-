import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js Middleware — runs on the Edge before any page or API route handler.
 *
 * Protected admin routes:  /admin/**
 *
 * Flow:
 *  1. If Supabase is not configured (demo/dev mode), allow through so local
 *     development works without credentials.
 *  2. If the user is not authenticated, redirect to /login?redirect=<path>.
 *  3. If the user is authenticated but profiles.is_admin is false, redirect
 *     to the storefront homepage.
 *  4. Otherwise, allow the request through.
 *
 * This is the authoritative gate — the client-side check in admin/layout.tsx
 * remains as a UX convenience (to hide the sidebar) but is NOT the security
 * boundary.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only guard admin routes
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // In demo/dev mode without real credentials, bypass auth entirely.
  const isDemoMode =
    !supabaseUrl ||
    supabaseUrl.includes('your-supabase-project-id') ||
    !supabaseAnonKey ||
    supabaseAnonKey.includes('placeholder');

  if (isDemoMode) {
    return NextResponse.next();
  }

  // Build the Supabase SSR client that reads/writes cookies on the response.
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: Record<string, unknown> }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options as any);
        });
      },
    },
  });

  // Use getUser() (not getSession()) — server-side verified against Supabase Auth.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Not logged in → redirect to login with a return URL
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Confirm admin role from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    // Authenticated but not admin → bounce to storefront homepage
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/';
    homeUrl.search = '';
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

export const config = {
  // Run on all /admin sub-routes including /admin itself
  matcher: ['/admin', '/admin/:path*'],
};

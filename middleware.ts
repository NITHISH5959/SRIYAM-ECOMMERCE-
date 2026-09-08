import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js Middleware — runs on the Edge before any page or API route handler.
 *
 * Protected admin routes: /sriyamadmin/** (except /sriyamadmin/login)
 *
 * Flow:
 *  1. If route is /sriyamadmin/login, allow through.
 *  2. If the user is not authenticated, redirect to /sriyamadmin/login?redirect=<path>.
 *  3. If the user is authenticated but profiles.is_admin is false, redirect
 *     to /sriyamadmin/login?error=no_access.
 *  4. Otherwise, allow the request through.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only guard admin routes
  if (!pathname.startsWith('/sriyamadmin')) {
    return NextResponse.next();
  }

  // Allow access to the dedicated admin login page
  if (pathname.startsWith('/sriyamadmin/login')) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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

  // Use getUser() — server-side verified against Supabase Auth.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Not logged in → redirect to dedicated admin login page
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/sriyamadmin/login';
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
    // Authenticated but not admin → bounce to admin login with error message
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/sriyamadmin/login';
    loginUrl.searchParams.set('error', 'no_access');
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  // Run on all /sriyamadmin sub-routes including /sriyamadmin itself
  matcher: ['/sriyamadmin', '/sriyamadmin/:path*'],
};

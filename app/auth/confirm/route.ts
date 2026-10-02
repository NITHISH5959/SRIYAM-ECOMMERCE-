import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/reset-password';

  const nextPath = next.startsWith('/') ? next : `/${next}`;
  const redirectUrl = new URL(nextPath, request.url);
  const failureUrl = new URL('/reset-password?error=expired', request.url);

  let response = NextResponse.redirect(redirectUrl);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  let isSuccess = false;

  if (token_hash && (type || type === null)) {
    const { error } = await supabase.auth.verifyOtp({
      type: (type || 'recovery') as EmailOtpType,
      token_hash,
    });
    if (!error) {
      isSuccess = true;
    } else {
      console.error('Supabase verifyOtp error:', error.message);
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      isSuccess = true;
    } else {
      console.error('Supabase exchangeCodeForSession error:', error.message);
    }
  }

  if (isSuccess) {
    return response;
  }

  return NextResponse.redirect(failureUrl);
}

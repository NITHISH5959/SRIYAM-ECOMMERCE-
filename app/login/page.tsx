'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { STORE_CONFIG } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/account/orders';
  const isForgotQuery = searchParams.get('forgot') === 'true' || searchParams.get('mode') === 'forgot';

  const { setUser } = useCart();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [isForgotMode, setIsForgotMode] = useState(isForgotQuery);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    setForgotSent(false);

    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        setForgotError('Please enter a valid email address.');
        setForgotLoading(false);
        return;
      }

      const supabase = createClient();
      const siteUrl = (
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        'https://sriyam.store'
      ).replace(/\/+$/, '');
      const redirectTo = `${siteUrl}/auth/confirm?next=/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });

      if (error) {
        setForgotError(error.message || 'Failed to send reset link. Please try again.');
        setForgotLoading(false);
        return;
      }

      setForgotSent(true);
    } catch (err: any) {
      setForgotError(err?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const supabase = createClient();
      const cleanEmail = email.trim().toLowerCase();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        setErrorMessage(error.message || 'Invalid email or password. Please try again.');
        return;
      }

      if (data?.user) {
        // Trigger claim-orders step in background to link any recent guest orders
        try {
          fetch('/api/account/claim-orders', { method: 'POST' }).catch(() => {});
        } catch {}

        // Query profiles.is_admin so the Admin nav link only shows for real admins.
        let isAdmin = false;
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', data.user.id)
            .single();
          isAdmin = profile?.is_admin === true;
        } catch {
          // Safe default
        }

        setUser({
          id: data.user.id,
          email: data.user.email || cleanEmail,
          name: data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
          isAdmin,
        });
        router.push(redirectUrl);
      }
    } catch (err: any) {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-xl space-y-6">
      <div className="text-center space-y-2">
        <div className="w-20 h-20 mx-auto flex items-center justify-center drop-shadow-lg">
          <Image
            src="/logo.png"
            alt={`${STORE_CONFIG.name} Logo`}
            width={80}
            height={80}
            className="object-contain"
            priority
          />
        </div>
        <h1 className="text-2xl font-serif font-bold text-zinc-900">
          {isForgotMode ? 'Reset Password' : `Sign In to ${STORE_CONFIG.name}`}
        </h1>
        <p className="text-xs text-zinc-500">
          {isForgotMode
            ? 'Enter your email to receive a secure password reset link.'
            : 'Sign in to access your orders and saved details.'}
        </p>
      </div>

      {isForgotMode ? (
        <div className="space-y-4">
          {forgotError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
              {forgotError}
            </div>
          )}

          {forgotSent ? (
            <div className="p-4 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200 space-y-3 text-center">
              <p className="font-semibold">Reset link sent!</p>
              <p className="text-emerald-700 leading-relaxed">
                We sent a password reset link to <strong className="font-mono text-emerald-900">{email}</strong>. Open the link to set your new password.
              </p>
              <button
                type="button"
                onClick={() => {
                  setForgotSent(false);
                  setIsForgotMode(false);
                }}
                className="text-xs font-bold text-emerald-900 underline hover:text-emerald-700"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleSendResetEmail} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-3 py-2.5 border border-zinc-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-700 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full py-3.5 bg-zinc-900 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-amber-800 disabled:opacity-50 transition-colors shadow-md flex items-center justify-center gap-2"
              >
                <span>{forgotLoading ? 'Sending Link...' : 'Email Reset Link'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotMode(false);
                    setForgotError('');
                  }}
                  className="text-xs text-zinc-500 hover:text-amber-800 font-medium"
                >
                  &larr; Back to sign in with password
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <>
          {errorMessage && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-3 py-2.5 border border-zinc-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-700 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotMode(true);
                    setErrorMessage('');
                  }}
                  className="text-[11px] text-amber-800 hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-9 py-2.5 border border-zinc-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-700 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-zinc-900 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-amber-800 disabled:opacity-50 transition-colors shadow-md flex items-center justify-center gap-2"
            >
              <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </>
      )}

      <div className="pt-4 border-t border-zinc-100 text-center">
        <p className="text-xs text-zinc-500">
          Don't have an account?{' '}
          <Link
            href={`/signup?redirect=${encodeURIComponent(redirectUrl)}`}
            className="font-bold text-amber-800 hover:underline"
          >
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <Suspense fallback={<div className="text-center p-8 text-xs text-zinc-500">Loading sign in...</div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { STORE_CONFIG } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';
import { Lock, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

function ResetPasswordContent() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Check if the user arrived via a valid recovery link
  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (isMounted) {
          if (!error && session?.user) {
            setHasValidSession(true);
          } else {
            setHasValidSession(false);
          }
        }
      } catch {
        if (isMounted) setHasValidSession(false);
      } finally {
        if (isMounted) setIsCheckingSession(false);
      }
    };

    checkSession();

    // Listen to auth state changes in case recovery token is being exchanged
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (isMounted) {
        if (event === 'PASSWORD_RECOVERY' || (session?.user && event === 'SIGNED_IN')) {
          setHasValidSession(true);
          setIsCheckingSession(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please check and try again.');
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setErrorMessage(error.message || 'Failed to update password. Your reset link may have expired.');
        return;
      }

      if (data?.user) {
        setSuccessMessage('Password successfully updated! Redirecting to your account...');

        // Claim any matching guest orders after password update
        try {
          await fetch('/api/account/claim-orders', { method: 'POST' });
        } catch {}

        setTimeout(() => {
          router.push('/account/orders');
        }, 1500);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-xl text-center space-y-4">
        <div className="w-8 h-8 border-2 border-amber-800 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-zinc-500 font-medium">Verifying reset password link...</p>
      </div>
    );
  }

  if (!hasValidSession) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-xl space-y-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-serif font-bold text-zinc-900">Reset Link Expired or Invalid</h1>
          <p className="text-xs text-zinc-500 leading-relaxed max-w-xs mx-auto">
            This password reset link is invalid or has already expired. Password reset links can only be used once.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full py-3 bg-zinc-900 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-amber-800 transition-colors shadow-md"
          >
            Request a New Reset Link
          </Link>
        </div>
      </div>
    );
  }

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
          Set New Password
        </h1>
        <p className="text-xs text-zinc-500">
          Enter your new password below (minimum 8 characters).
        </p>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg border border-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleResetPassword} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
            New Password *
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
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

        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
            Confirm New Password *
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              className="w-full pl-9 pr-3 py-2.5 border border-zinc-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-700 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || Boolean(successMessage)}
          className="w-full py-3.5 bg-zinc-900 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-amber-800 disabled:opacity-50 transition-colors shadow-md flex items-center justify-center gap-2"
        >
          <span>{isLoading ? 'Updating Password...' : 'Save Password & Continue'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="pt-4 border-t border-zinc-100 text-center">
        <Link
          href="/login"
          className="text-xs font-semibold text-zinc-500 hover:text-zinc-800"
        >
          &larr; Back to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <Suspense fallback={<div className="text-center p-8 text-xs text-zinc-500">Loading...</div>}>
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}

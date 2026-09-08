'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { STORE_CONFIG } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, ArrowRight } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const { setUser } = useCart();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message || 'Invalid email or password. Please try again.');
        return;
      }

      if (data?.user) {
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
          email: data.user.email || email,
          name: data.user.user_metadata?.full_name || email.split('@')[0],
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
          Sign In to {STORE_CONFIG.name}
        </h1>
        <p className="text-xs text-zinc-500">
          Login is required to proceed to secure checkout.
        </p>
      </div>

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
          <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-3 py-2.5 border border-zinc-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-700 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 bg-zinc-900 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-amber-800 transition-colors shadow-md flex items-center justify-center gap-2"
        >
          <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

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

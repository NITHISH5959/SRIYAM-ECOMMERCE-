'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { STORE_CONFIG } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, Mail, Lock, ArrowRight } from 'lucide-react';

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/sriyamadmin/products';
  const urlError = searchParams.get('error');

  const { setUser } = useCart();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (urlError === 'no_access') {
      setErrorMessage('This account does not have admin access.');
    }
  }, [urlError]);

  const handleAdminLogin = async (e: React.FormEvent) => {
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
        setErrorMessage(error.message || 'Invalid email or password.');
        setIsLoading(false);
        return;
      }

      if (data?.user) {
        // Query profiles.is_admin to explicitly verify admin privileges
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', data.user.id)
          .single();

        if (profileError || !profile?.is_admin) {
          // Immediately sign out non-admin accounts to ensure clean session state
          await supabase.auth.signOut();
          setErrorMessage('This account does not have admin access.');
          setIsLoading(false);
          return;
        }

        // Real admin verified
        setUser({
          id: data.user.id,
          email: data.user.email || email,
          name: data.user.user_metadata?.full_name || email.split('@')[0],
          isAdmin: true,
        });

        router.push(redirectUrl);
      }
    } catch (err: any) {
      setErrorMessage('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 shadow-2xl space-y-6 text-zinc-100">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto bg-zinc-800 border border-zinc-700 rounded-2xl flex items-center justify-center text-amber-500 shadow-inner">
          <ShieldCheck className="w-9 h-9" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-zinc-100">
          Admin Sign In
        </h1>
        <p className="text-xs text-zinc-400">
          Enter administrator credentials to access the Sriyam Control Panel.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-red-950/80 border border-red-800 text-red-300 text-xs rounded-xl font-medium">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleAdminLogin} className="space-y-4">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Admin Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@sriyamstore.com"
              className="w-full pl-9 pr-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 bg-amber-700 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <span>{isLoading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="pt-4 border-t border-zinc-800 text-center">
        <p className="text-[11px] text-zinc-500">
          Sriyam Store Administrative Portal · Protected System
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Suspense fallback={<div className="text-center p-8 text-xs text-zinc-400">Loading admin login...</div>}>
          <AdminLoginContent />
        </Suspense>
      </div>
    </div>
  );
}

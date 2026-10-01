'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { STORE_CONFIG } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, User, Phone, ArrowRight, Eye, EyeOff } from 'lucide-react';

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/account/orders';

  const { setUser } = useCart();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setIsAlreadyRegistered(false);

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
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
      const cleanEmail = email.trim().toLowerCase();
      const cleanFullName = fullName.trim();
      const cleanPhoneNumber = phone.trim();

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            full_name: cleanFullName,
            phone: cleanPhoneNumber,
          },
        },
      });

      if (error) {
        if (
          error.message.toLowerCase().includes('already registered') ||
          error.message.toLowerCase().includes('already exists') ||
          error.message.toLowerCase().includes('unique violation')
        ) {
          setIsAlreadyRegistered(true);
          setErrorMessage('An account with this email address already exists.');
        } else {
          setErrorMessage(error.message || 'Failed to create account. Please try again.');
        }
        return;
      }

      if (!data?.user) {
        setErrorMessage('Account creation failed. Please try again.');
        return;
      }

      // Explicitly upsert profile row to guarantee full_name, phone, email exist
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: cleanFullName,
          phone: cleanPhoneNumber,
          email: cleanEmail,
          is_admin: false,
        });
      } catch {}

      // Call claim-orders step to double-match and link past guest orders
      try {
        await fetch('/api/account/claim-orders', { method: 'POST' });
      } catch (claimErr) {
        console.warn('[signup] Claim orders warning:', claimErr);
      }

      const newUser = {
        id: data.user.id,
        email: cleanEmail,
        name: cleanFullName || cleanEmail.split('@')[0],
        isAdmin: false,
      };
      setUser(newUser);
      router.push(redirectUrl);
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
          Create Account
        </h1>
        <p className="text-xs text-zinc-500">
          Join {STORE_CONFIG.name} to track orders and save delivery addresses.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 space-y-1">
          <p>{errorMessage}</p>
          {isAlreadyRegistered && (
            <p>
              <Link
                href={`/login?redirect=${encodeURIComponent(redirectUrl)}`}
                className="font-bold underline text-red-900 hover:text-red-700"
              >
                Click here to Sign In &rarr;
              </Link>
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
            Full Name *
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Sriram Ramanathan"
              className="w-full pl-9 pr-3 py-2.5 border border-zinc-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-700 focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
            Email Address *
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
            Phone Number *
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full pl-9 pr-3 py-2.5 border border-zinc-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-700 focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
            Password *
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
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
            Confirm Password *
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              className="w-full pl-9 pr-3 py-2.5 border border-zinc-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-700 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 bg-zinc-900 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-amber-800 transition-colors shadow-md flex items-center justify-center gap-2"
        >
          <span>{isLoading ? 'Creating Account...' : 'Register & Continue'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <p className="text-xs text-center text-zinc-500 pt-2">
        Already registered?{' '}
        <Link
          href={`/login?redirect=${encodeURIComponent(redirectUrl)}`}
          className="font-bold text-amber-800 hover:underline"
        >
          Sign In
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <Suspense fallback={<div className="text-center p-8 text-xs text-zinc-500">Loading signup...</div>}>
        <SignupContent />
      </Suspense>
    </div>
  );
}

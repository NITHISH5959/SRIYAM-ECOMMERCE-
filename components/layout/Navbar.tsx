'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { STORE_CONFIG } from '@/lib/config';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { ShoppingBag, Menu, X, MessageCircle, ShieldCheck, User, LogOut, Package, MapPin, ChevronDown, CheckCircle2 } from 'lucide-react';

// ── Slide-in toast that auto-dismisses ────────────────────────────────────────
function Toast({ message }: { message: string }) {
  const [leaving, setLeaving] = useState(false);

  // Trigger the slide-out 200ms before the parent removes this component
  // (CartContext clears toastMessage after 3 s; we start exit at 2.8 s)
  useEffect(() => {
    const t = setTimeout(() => setLeaving(true), 2750);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-zinc-900 text-white text-xs font-medium shadow-2xl border border-zinc-700 max-w-xs ${leaving ? 'animate-toast-out' : 'animate-toast-in'}`}
      style={{ willChange: 'transform, opacity' }}
    >
      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export default function Navbar() {
  const { totalItems, toastMessage, user, setUser } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    // Invalidate the Supabase session so refresh doesn't restore the user
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch (e) {
        console.error('[signOut error]', e);
      }
    }
    setUser(null);
    setAccountOpen(false);
    setMobileMenuOpen(false);
  };

  // Close account dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Shop All', href: '/shop' },
    { name: 'Frames', href: '/shop?category=frames' },
    { name: 'Rack Posters', href: '/shop?category=rack-posters' },
  ];

  return (
    <>
      {/* Slide-in toast — uses key so it remounts (and re-animates) on each new message */}
      {toastMessage && <Toast key={toastMessage + Date.now()} message={toastMessage} />}

      {/* Top Banner */}
      <div className="bg-zinc-900 text-zinc-300 text-[11px] font-medium py-1.5 px-4 text-center tracking-wide border-b border-zinc-800 flex justify-center items-center gap-4">
        <span>✨ Authentic Sacred Art &amp; Fine Heritage Printing</span>
      </div>

      {/* Main Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-100 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 group">
              <Image
                src="/logo.png"
                alt={`${STORE_CONFIG.name} Logo`}
                width={56}
                height={56}
                className="object-contain drop-shadow-md transition-transform group-hover:scale-105 duration-200 flex-shrink-0"
                priority
                quality={100}
              />
              <div className="flex flex-col">
                <span className="font-serif font-bold text-xl text-zinc-900 tracking-tight leading-none group-hover:text-amber-800 transition-colors">
                  {STORE_CONFIG.name}
                </span>
                <span className="text-[9px] uppercase tracking-widest text-zinc-400 font-medium mt-0.5">
                  Bringing Divinity to Every Home
                </span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link key={link.name} href={link.href}
                  className="text-xs font-medium text-zinc-600 hover:text-amber-800 tracking-wider uppercase transition-colors">
                  {link.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right Icons */}
          <div className="flex items-center gap-3">
            {/* WhatsApp */}
            <a href={`https://wa.me/${STORE_CONFIG.whatsappNumber.replace(/\+/g, '')}?text=${encodeURIComponent(STORE_CONFIG.whatsappMessage)}`}
              target="_blank" rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full font-medium transition-colors border border-emerald-200/60"
              title="Chat on WhatsApp">
              <MessageCircle className="w-3.5 h-3.5 fill-emerald-600 stroke-none" />
              <span>WhatsApp Us</span>
            </a>

            {/* Account Dropdown / Sign In */}
            {user ? (
              <div className="relative hidden lg:block" ref={accountRef}>
                <button
                  onClick={() => setAccountOpen(o => !o)}
                  className="flex items-center gap-1.5 text-xs bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-full hover:bg-zinc-100 transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-amber-700" />
                  <span className="font-bold text-zinc-800 max-w-[90px] truncate">{user.name}</span>
                  <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
                </button>

                {accountOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-zinc-200 rounded-xl shadow-lg py-2 z-50">
                    <div className="px-3 py-1.5 border-b border-zinc-100 mb-1">
                      <p className="text-[11px] font-bold text-zinc-900 truncate">{user.name}</p>
                      <p className="text-[10px] text-zinc-400 truncate">{user.email}</p>
                    </div>
                    <Link href="/account/orders" onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-amber-50 hover:text-amber-800 transition-colors">
                      <Package className="w-3.5 h-3.5" />My Orders
                    </Link>
                    <Link href="/account/addresses" onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-amber-50 hover:text-amber-800 transition-colors">
                      <MapPin className="w-3.5 h-3.5" />Saved Addresses
                    </Link>
                    <div className="border-t border-zinc-100 mt-1 pt-1">
                      <button onClick={handleSignOut}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors">
                        <LogOut className="w-3.5 h-3.5" />Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login"
                className="hidden lg:flex items-center gap-1 text-xs font-semibold text-zinc-700 hover:text-amber-800 border border-zinc-200 px-3 py-1.5 rounded-md transition-colors">
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
            )}

            {/* Admin Badge — only visible to admin users (UI convenience; real gate is server-side) */}
            {user?.isAdmin && (
              <Link href="/sriyamadmin"
                className="hidden xl:flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-900 border border-zinc-200 px-2.5 py-1 rounded-md transition-colors">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin</span>
              </Link>
            )}

            {/* Cart icon — badge pops on count change via React key */}
            <Link href="/cart" className="relative p-2 text-zinc-700 hover:text-amber-800 transition-colors" aria-label="Open cart">
              <ShoppingBag className="w-5 h-5 stroke-[1.75]" />
              {totalItems > 0 && (
                <span
                  key={totalItems}
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-700 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm animate-badge-pop"
                  style={{ willChange: 'transform, opacity' }}
                >
                  {totalItems}
                </span>
              )}
            </Link>

            {/* Mobile Hamburger */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-zinc-700 hover:text-zinc-900" aria-label="Toggle menu">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-zinc-200 px-4 pt-2 pb-6 space-y-3">
            <nav className="flex flex-col space-y-1">
              {navLinks.map((link) => (
                <Link key={link.name} href={link.href} onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 rounded-md transition-colors">
                  {link.name}
                </Link>
              ))}
            </nav>
            <div className="pt-2 border-t border-zinc-100 flex flex-col gap-2">
              {user ? (
                <>
                  <div className="px-3 py-2 bg-zinc-50 rounded-lg text-xs font-bold text-zinc-800 flex justify-between items-center">
                    <span>Hi, {user.name}</span>
                    <button onClick={handleSignOut} className="text-red-600 font-bold flex items-center gap-1">
                      <LogOut className="w-3.5 h-3.5" />Sign Out
                    </button>
                  </div>
                  <Link href="/account/orders" onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-amber-50 rounded-md">
                    <Package className="w-4 h-4" />My Orders
                  </Link>
                  <Link href="/account/addresses" onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-amber-50 rounded-md">
                    <MapPin className="w-4 h-4" />Saved Addresses
                  </Link>
                </>
              ) : (
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50 rounded-md text-center border border-amber-200">
                  Sign In / Create Account
                </Link>
              )}
              {user?.isAdmin && (
                <Link href="/sriyamadmin" onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-50 rounded-md">
                  <ShieldCheck className="w-4 h-4" />Admin Panel
                </Link>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { createClient } from '@/lib/supabase/client';
import { Package, Tag, ShoppingBag, Store, ExternalLink, Loader2 } from 'lucide-react';
import { STORE_CONFIG } from '@/lib/config';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useCart();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=/admin');
      return;
    }

    const verifyRole = async () => {
      try {
        const supabase = createClient();
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

        const isDemoMode =
          !supabaseUrl ||
          supabaseUrl.includes('your-supabase-project-id') ||
          supabaseAnonKey.includes('placeholder');

        if (isDemoMode || user.id === 'demo_user_id') {
          setIsAdmin(true);
          setChecking(false);
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        if (!error && data?.is_admin) {
          setIsAdmin(true);
        } else {
          router.push('/');
        }
      } catch (err) {
        console.error('Admin layout client-side role check failed:', err);
        router.push('/');
      } finally {
        setChecking(false);
      }
    };

    verifyRole();
  }, [user, router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-zinc-100 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-amber-800 animate-spin" />
        <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Verifying Admin Credentials...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-100/70 flex flex-col md:flex-row">
      {/* Admin Sidebar */}
      <aside className="w-full md:w-64 bg-zinc-900 text-zinc-300 flex-shrink-0 border-r border-zinc-800 flex flex-col justify-between">
        <div>
          {/* Admin Header Branding */}
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative w-8 h-8 flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt={`${STORE_CONFIG.name} Logo`}
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <div>
                <h2 className="font-bold text-sm text-zinc-100">{STORE_CONFIG.name}</h2>
                <p className="text-[10px] text-amber-500 font-medium uppercase tracking-wider">
                  Admin Control Panel
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            <Link
              href="/admin/products"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                pathname.startsWith('/admin/products') || pathname === '/admin'
                  ? 'bg-amber-800 text-white shadow-sm'
                  : 'hover:bg-zinc-800/70 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Products</span>
            </Link>

            <Link
              href="/admin/coupons"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                pathname.startsWith('/admin/coupons')
                  ? 'bg-amber-800 text-white shadow-sm'
                  : 'hover:bg-zinc-800/70 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Coupons</span>
            </Link>

            <Link
              href="/admin/orders"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                pathname.startsWith('/admin/orders')
                  ? 'bg-amber-800 text-white shadow-sm'
                  : 'hover:bg-zinc-800/70 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Orders</span>
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-zinc-800 space-y-3">
          <Link
            href="/"
            className="flex items-center justify-between px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-md transition-colors"
          >
            <span className="flex items-center gap-2">
              <Store className="w-3.5 h-3.5" />
              Back to Store
            </span>
            <ExternalLink className="w-3 h-3" />
          </Link>

          <div className="px-3 py-2 bg-amber-950/40 border border-amber-800/40 rounded-md text-[10px] text-amber-300">
            <span className="font-bold">Role:</span> Super Admin (profiles.is_admin = true)
          </div>
        </div>
      </aside>

      {/* Main Admin Content View */}
      <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

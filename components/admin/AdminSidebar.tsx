'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Package, Tag, ShoppingBag, Store, ExternalLink } from 'lucide-react';
import { STORE_CONFIG } from '@/lib/config';

/**
 * Client component for the admin sidebar navigation.
 * Extracted from admin/layout.tsx so that the parent layout can remain a
 * Server Component (which is where the real server-side auth check lives).
 */
export default function AdminSidebar() {
  const pathname = usePathname();

  return (
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
            href="/sriyamadmin/products"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              pathname.startsWith('/sriyamadmin/products') || pathname === '/sriyamadmin'
                ? 'bg-amber-800 text-white shadow-sm'
                : 'hover:bg-zinc-800/70 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Products</span>
          </Link>

          <Link
            href="/sriyamadmin/coupons"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              pathname.startsWith('/sriyamadmin/coupons')
                ? 'bg-amber-800 text-white shadow-sm'
                : 'hover:bg-zinc-800/70 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Coupons</span>
          </Link>

          <Link
            href="/sriyamadmin/orders"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              pathname.startsWith('/sriyamadmin/orders')
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
  );
}

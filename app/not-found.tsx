import React from 'react';
import Link from 'next/link';
import { Home, ArrowLeft, HelpCircle } from 'lucide-react';
import { STORE_CONFIG } from '@/lib/config';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-zinc-50">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-2xl border border-zinc-200 shadow-xl">
        <div className="w-16 h-16 bg-amber-50 text-amber-800 rounded-full flex items-center justify-center mx-auto border border-amber-100 shadow-sm animate-pulse">
          <HelpCircle className="w-9 h-9 stroke-[1.5]" />
        </div>
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full uppercase tracking-widest border border-amber-200">
            404 — Page Not Found
          </span>
          <h1 className="text-3xl font-serif font-bold text-zinc-900 pt-2">
            Lost in Translation?
          </h1>
          <p className="text-xs text-zinc-500 leading-relaxed">
            The page you are looking for does not exist, was removed, or is temporarily unavailable under {STORE_CONFIG.name}.
          </p>
        </div>
        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-5 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-md"
          >
            <Home className="w-4 h-4" />
            <span>Go Home</span>
          </Link>
          <Link
            href="/shop"
            className="px-5 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors border border-zinc-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Shop</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

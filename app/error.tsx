'use client';

import React from 'react';
import Link from 'next/link';
import { AlertOctagon, Home, RefreshCw } from 'lucide-react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-zinc-50">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-2xl border border-zinc-200 shadow-xl">
        <div className="w-16 h-16 bg-red-50 text-red-700 rounded-full flex items-center justify-center mx-auto border border-red-100 shadow-sm">
          <AlertOctagon className="w-9 h-9 stroke-[1.5]" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold text-red-700 bg-red-50 px-3 py-1 rounded-full uppercase tracking-widest border border-red-200">
            500 — Server Error
          </span>
          <h1 className="text-3xl font-serif font-bold text-zinc-900 pt-2">
            Something Went Wrong
          </h1>
          <p className="text-xs text-zinc-500 leading-relaxed">
            An unexpected error occurred. Our team has been notified. Please try again or return to the homepage.
          </p>
          {process.env.NODE_ENV === 'development' && error?.message && (
            <pre className="mt-3 text-left text-[10px] bg-zinc-100 border border-zinc-200 rounded-lg p-3 overflow-auto text-red-700 font-mono max-h-32">
              {error.message}
            </pre>
          )}
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-3 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-md"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="px-5 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors border border-zinc-200"
          >
            <Home className="w-4 h-4" />
            <span>Go Home</span>
          </Link>
        </div>

        {error?.digest && (
          <p className="text-[10px] text-zinc-400 font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}

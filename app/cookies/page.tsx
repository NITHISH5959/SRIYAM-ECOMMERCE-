import React from 'react';
import Link from 'next/link';
import { STORE_CONFIG } from '@/lib/config';
import { Cookie, ShieldCheck, ArrowLeft, ExternalLink, Globe, FileText, Lock } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Cookie Policy & Site References — ${STORE_CONFIG.name}`,
  description: `Information about cookie usage, session storage, and site references for ${STORE_CONFIG.name}.`,
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-zinc-50/50 py-12 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Breadcrumb / Back Link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-amber-800 transition-colors uppercase tracking-wider"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Store</span>
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white p-8 sm:p-10 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-full text-xs font-semibold uppercase tracking-widest">
            <Cookie className="w-3.5 h-3.5 text-amber-700" />
            <span>Transparency & Compliance</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-zinc-900 tracking-tight">
            Cookie Policy & Site References
          </h1>
          <p className="text-xs text-zinc-500">
            Last Updated: September 2026 · Explaining how cookies are used and platform attributions
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-6">

          {/* Section 1: Cookie Overview */}
          <section className="bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
            <h2 className="text-lg font-serif font-bold text-zinc-900 flex items-center gap-2">
              <Cookie className="w-5 h-5 text-amber-800" />
              <span>What Are Cookies?</span>
            </h2>
            <div className="text-xs sm:text-sm text-zinc-600 leading-relaxed space-y-2">
              <p>
                Cookies are small data files stored on your browser when you visit <strong>{STORE_CONFIG.name}</strong>. They enable the store to remember your active shopping session, cart items, and account login credentials.
              </p>
            </div>
          </section>

          {/* Section 2: Types of Cookies We Use */}
          <section className="bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
            <h2 className="text-lg font-serif font-bold text-zinc-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-800" />
              <span>Cookies We Employ</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1.5">
                <h3 className="font-bold text-zinc-900 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-amber-700" />
                  <span>Essential / Session Cookies</span>
                </h3>
                <p className="text-zinc-600 text-[11px] leading-relaxed">
                  Necessary for core store operations including keeping items in your shopping cart, authentication tokens, and securing checkout.
                </p>
              </div>

              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1.5">
                <h3 className="font-bold text-zinc-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-700" />
                  <span>Functional Storage</span>
                </h3>
                <p className="text-zinc-600 text-[11px] leading-relaxed">
                  Remembers user preferences such as selected delivery state, recent product views, and active promo discount application.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Site References & Affiliated Ventures */}
          <section id="references" className="bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
            <h2 className="text-lg font-serif font-bold text-zinc-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-amber-800" />
              <span>Site References & Partner Ventures</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
              <strong>{STORE_CONFIG.name}</strong> operates in collaboration with our technical development and cultural preservation partners:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
              <a
                href="https://templeint.in"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 bg-zinc-900 text-white rounded-xl border border-zinc-800 hover:border-amber-500/50 transition-all group flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm text-amber-400">TempleINT</span>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-400 transition-colors" />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">templeint.in</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  International Temple Heritage, Pilgrimage Directories & Cultural Archive.
                </p>
              </a>

              <a
                href="https://ctrlshift.in"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 bg-zinc-900 text-white rounded-xl border border-zinc-800 hover:border-amber-500/50 transition-all group flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm text-amber-400">CtrlShift</span>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-400 transition-colors" />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">ctrlshift.in</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Digital Engineering, E-Commerce Solutions & Web Technology Studio.
                </p>
              </a>
            </div>
          </section>

          {/* Section 4: Contact */}
          <section className="bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
            <h2 className="text-lg font-serif font-bold text-zinc-900">
              Questions Regarding Cookies?
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
              If you have any queries about our cookie policy or partner references, feel free to write to us at{' '}
              <a href={`mailto:${STORE_CONFIG.contact.email}`} className="text-amber-800 font-semibold underline">
                {STORE_CONFIG.contact.email}
              </a>.
            </p>
          </section>

        </div>

      </div>
    </div>
  );
}

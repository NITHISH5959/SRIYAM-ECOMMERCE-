import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { STORE_CONFIG } from '@/lib/config';
import { MessageCircle, ShieldCheck, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-zinc-950 text-zinc-400 text-xs border-t border-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Col */}
          <div className="space-y-5 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 ring-1 ring-white/20 shadow-lg">
                <Image
                  src="/logo.png"
                  alt={`${STORE_CONFIG.name} Logo`}
                  width={48}
                  height={48}
                  className="object-contain"
                  quality={100}
                />
              </div>
              <div className="flex flex-col">
                <span className="font-serif font-bold text-lg text-zinc-100 tracking-tight leading-tight">
                  {STORE_CONFIG.name}
                </span>
                <span className="text-[9px] uppercase tracking-widest text-amber-500/80 font-medium mt-0.5">
                  Bringing Divinity to Every Home
                </span>
              </div>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed max-w-sm">
              {STORE_CONFIG.description}
            </p>
            <div className="pt-2">
              <a
                href={`https://wa.me/${STORE_CONFIG.whatsappNumber.replace(/\+/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-3 py-1.5 rounded-md hover:bg-emerald-900/50 transition-colors text-xs font-medium"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-emerald-400 stroke-none" />
                <span>WhatsApp Support</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-zinc-200 font-semibold uppercase tracking-wider text-[11px]">
              Categories
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/shop" className="hover:text-amber-400 transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/shop?category=frames" className="hover:text-amber-400 transition-colors">
                  Sacred Frames
                </Link>
              </li>
              <li>
                <Link href="/shop?category=rack-posters" className="hover:text-amber-400 transition-colors">
                  Heritage Rack Posters
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Care */}
          <div className="space-y-3">
            <h4 className="text-zinc-200 font-semibold uppercase tracking-wider text-[11px]">
              Store & Admin
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/admin" className="hover:text-amber-400 transition-colors flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin Management</span>
                </Link>
              </li>
              <li>
                <span className="text-zinc-500">Free Delivery over ₹999</span>
              </li>
              <li>
                <span className="text-zinc-500">Secure Online & Cash Payments</span>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="text-zinc-200 font-semibold uppercase tracking-wider text-[11px]">
              Contact Us
            </h4>
            <p className="text-zinc-400 leading-relaxed">
              Email: {STORE_CONFIG.contact.email}
              <br />
              Phone: {STORE_CONFIG.contact.phone}
              <br />
              Location: {STORE_CONFIG.contact.location}
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-6 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-500 text-[11px]">
          <p>© {new Date().getFullYear()} {STORE_CONFIG.name}. All rights reserved.</p>
          <div className="flex items-center gap-1">
            <span>Crafted with</span>
            <Heart className="w-3 h-3 text-amber-600 fill-amber-600" />
            <span>for Spiritual Heritage</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

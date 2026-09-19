import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { STORE_CONFIG } from '@/lib/config';
import { MessageCircle, Heart, Truck, ShieldCheck, ExternalLink, Globe, Cookie } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-zinc-950 text-zinc-400 text-xs border-t border-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          
          {/* Col 1: Brand Info & Trust */}
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              {/* Logo with clean white background */}
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center flex-shrink-0 p-1.5 shadow-md border border-zinc-200">
                <Image
                  src="/logo.png"
                  alt={`${STORE_CONFIG.name} Logo`}
                  width={46}
                  height={46}
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

            <p className="text-zinc-400 text-xs leading-relaxed">
              {STORE_CONFIG.description}
            </p>

            <div className="space-y-2 pt-1 text-[11px] text-zinc-400">
              <div className="flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span>Flat ₹50 Delivery Across India</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span>100% Secure Online & Cash Payments</span>
              </div>
            </div>

            <div className="pt-1">
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

          {/* Col 2: Categories */}
          <div className="space-y-3 lg:pl-4">
            <h4 className="text-zinc-200 font-semibold uppercase tracking-wider text-[11px]">
              Categories
            </h4>
            <ul className="space-y-2.5 text-xs">
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
              <li>
                <Link href="/shop?category=rack-posters" className="hover:text-amber-400 transition-colors text-zinc-400">
                  Paadal Petra Sthalam
                </Link>
              </li>
              <li>
                <Link href="/shop?category=rack-posters" className="hover:text-amber-400 transition-colors text-zinc-400">
                  108 Divya Desam
                </Link>
              </li>
              <li>
                <Link href="/shop?category=rack-posters" className="hover:text-amber-400 transition-colors text-zinc-400">
                  51 Sakthi Peedam
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Explore Our Other Ventures */}
          <div className="space-y-3">
            <h4 className="text-zinc-200 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-amber-500" />
              <span>Explore Our Other Ventures</span>
            </h4>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Discover our affiliated digital platforms and heritage portals:
            </p>

            <div className="space-y-2.5 pt-1">
              <a
                href="https://ctrlshift.in"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-amber-500/40 hover:bg-zinc-900 transition-all shadow-sm"
              >
                <div className="space-y-0.5">
                  <span className="font-serif font-bold text-xs text-zinc-200 group-hover:text-amber-400 transition-colors flex items-center gap-1">
                    ctrlshift.in
                  </span>
                  <p className="text-[10px] text-zinc-400">Digital &amp; Tech Engineering</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-amber-400 transition-colors flex-shrink-0" />
              </a>

              <a
                href="https://templeint.in"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-amber-500/40 hover:bg-zinc-900 transition-all shadow-sm"
              >
                <div className="space-y-0.5">
                  <span className="font-serif font-bold text-xs text-zinc-200 group-hover:text-amber-400 transition-colors flex items-center gap-1">
                    templeint.in
                  </span>
                  <p className="text-[10px] text-zinc-400">Temple Heritage &amp; Devotion</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-amber-400 transition-colors flex-shrink-0" />
              </a>
            </div>
          </div>

          {/* Col 4: Contact Us & Legal Policies */}
          <div className="space-y-5">
            <div className="space-y-2">
              <h4 className="text-zinc-200 font-semibold uppercase tracking-wider text-[11px]">
                Contact Us
              </h4>
              <div className="text-zinc-400 leading-relaxed text-xs space-y-1">
                <p>
                  <span className="text-zinc-500">Email:</span>{' '}
                  <a href={`mailto:${STORE_CONFIG.contact.email}`} className="text-zinc-300 hover:text-amber-400 underline">
                    {STORE_CONFIG.contact.email}
                  </a>
                </p>
                <p>
                  <span className="text-zinc-500">Phone:</span> {STORE_CONFIG.contact.phone}
                </p>
                <p>
                  <span className="text-zinc-500">Location:</span> {STORE_CONFIG.contact.location}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-zinc-900">
              <h4 className="text-zinc-200 font-semibold uppercase tracking-wider text-[11px]">
                Policies &amp; Legal
              </h4>
              <ul className="space-y-1.5 text-xs">
                <li>
                  <Link href="/terms" className="text-zinc-400 hover:text-amber-400 transition-colors">
                    Terms &amp; Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-zinc-400 hover:text-amber-400 transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/cookies" className="text-zinc-400 hover:text-amber-400 transition-colors flex items-center gap-1">
                    <Cookie className="w-3 h-3 text-amber-500/80" />
                    <span>Cookie Policy</span>
                  </Link>
                </li>
                <li>
                  <Link href="/cookies#references" className="text-zinc-400 hover:text-amber-400 transition-colors">
                    Site References &amp; Credits
                  </Link>
                </li>
              </ul>
            </div>
          </div>

        </div>

        {/* Bottom Bar / Copyright */}
        <div className="mt-12 pt-6 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-500 text-[11px]">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <p>© {new Date().getFullYear()} {STORE_CONFIG.name}. All rights reserved.</p>
            <span>·</span>
            <Link href="/terms" className="hover:text-zinc-300 transition-colors">Terms</Link>
            <span>·</span>
            <Link href="/privacy" className="hover:text-zinc-300 transition-colors">Privacy</Link>
            <span>·</span>
            <Link href="/cookies" className="hover:text-zinc-300 transition-colors">Cookies</Link>
          </div>
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

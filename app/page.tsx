import React from 'react';
import Link from 'next/link';
import { getProducts, getCategories } from '@/lib/data';
import ProductCard from '@/components/products/ProductCard';
import { STORE_CONFIG } from '@/lib/config';
import { ArrowRight, Sparkles, Truck, Shield, Award, MessageCircle, Frame, MapPin } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: `${STORE_CONFIG.name} — ${STORE_CONFIG.tagline}`,
  description: STORE_CONFIG.description,
  alternates: {
    canonical: 'https://sriyamstore.com',
  },
  openGraph: {
    title: `${STORE_CONFIG.name} — Sacred Spiritual Art Frames & Heritage Posters`,
    description: STORE_CONFIG.description,
    type: 'website',
    url: 'https://sriyamstore.com',
    images: [{ url: '/logo.png', width: 1024, height: 1024, alt: 'Sriyam Store' }],
  },
};

export const revalidate = 60; // ISR revalidate every 60 seconds

export default async function HomePage() {
  const products = await getProducts();
  const categories = await getCategories();

  const featuredProducts = products.slice(0, 8);

  return (
    <div className="space-y-16 lg:space-y-24 pb-16">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-b from-amber-50/60 via-zinc-50 to-white py-16 sm:py-24 border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100/80 text-amber-900 border border-amber-200/80 rounded-full text-xs font-semibold uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>Original Sacred Heritage Collection</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-zinc-900 tracking-tight leading-[1.15]">
                Sacred Art Frames & <span className="text-amber-800 underline decoration-amber-300 underline-offset-8">Heritage Posters</span>
              </h1>

              <p className="text-base sm:text-lg text-zinc-600 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
                Bring divine serenity to your home with our carefully crafted Paadal Petra Sthalam posters, 108 Divya Desam guides, and sacred temple frames.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  href="/shop"
                  className="w-full sm:w-auto px-8 py-3.5 bg-zinc-900 text-white font-semibold text-xs uppercase tracking-widest rounded-lg hover:bg-amber-800 transition-colors duration-200 shadow-md flex items-center justify-center gap-2 group"
                >
                  <span>Explore Store</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href="/shop?category=frames"
                  className="w-full sm:w-auto px-8 py-3.5 bg-white text-zinc-800 border border-zinc-300 font-semibold text-xs uppercase tracking-widest rounded-lg hover:bg-zinc-50 transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <Frame className="w-4 h-4 text-amber-700" />
                  <span>Sacred Frames</span>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="pt-6 grid grid-cols-3 gap-4 border-t border-zinc-200/60 max-w-lg mx-auto lg:mx-0 text-left">
                <div>
                  <p className="text-lg font-bold text-zinc-900">100%</p>
                  <p className="text-[11px] text-zinc-500 font-medium">Sacred Accuracy</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-zinc-900">₹599</p>
                  <p className="text-[11px] text-zinc-500 font-medium">Standard Pricing</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-zinc-900">Free</p>
                  <p className="text-[11px] text-zinc-500 font-medium">Shipping &gt; ₹999</p>
                </div>
              </div>
            </div>

            {/* Right Visual Highlight */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md bg-white p-6 rounded-2xl shadow-xl border border-zinc-200/80">
                <div className="aspect-[4/5] bg-gradient-to-br from-amber-50 via-stone-100 to-amber-100/50 rounded-xl flex flex-col items-center justify-center p-8 text-center border border-amber-200/50">
                  <div className="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center text-amber-800 mb-4">
                    <MapPin className="w-8 h-8 stroke-[1.5]" />
                  </div>
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-widest mb-1">
                    Featured Masterpiece
                  </span>
                  <h3 className="text-xl font-serif font-bold text-zinc-900 mb-2">
                    276 Paadal Petra Sthalam
                  </h3>
                  <p className="text-xs text-zinc-500 max-w-xs mb-4">
                    Archival quality poster listing all 276 revered Shiva temples across South India.
                  </p>
                  <div className="flex items-center gap-2 bg-white px-4 py-1.5 rounded-full shadow-sm border border-zinc-200">
                    <span className="text-xs font-bold text-amber-800">Special Offer</span>
                    <span className="text-xs text-zinc-400 line-through">₹649</span>
                    <span className="text-sm font-extrabold text-zinc-900">₹599</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Categories Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-amber-800 mb-2">
            Curated Collections
          </h2>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-zinc-900">
            Browse by Spiritual Category
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Frames Category */}
          <Link
            href="/shop?category=frames"
            className="group relative bg-white border border-zinc-200 rounded-2xl p-8 hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 p-8 text-amber-100 group-hover:text-amber-200 transition-colors">
              <Frame className="w-32 h-32 stroke-[0.75] transform translate-x-8 -translate-y-8" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200/60 inline-block mb-4">
                9 Premium Items
              </span>
              <h3 className="text-2xl font-serif font-bold text-zinc-900 group-hover:text-amber-800 transition-colors mb-2">
                Sacred Frames
              </h3>
              <p className="text-sm text-zinc-600 max-w-md">
                3 Rajas, Natarajar with Naalvar, Panja Sabai, Aaru Padai Veedu, and 3 Sakthi framed with divine elegance.
              </p>
            </div>
            <div className="mt-8 flex items-center gap-2 text-xs font-bold text-zinc-900 uppercase tracking-widest group-hover:text-amber-800">
              <span>View Frames</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Rack Posters Category */}
          <Link
            href="/shop?category=rack-posters"
            className="group relative bg-white border border-zinc-200 rounded-2xl p-8 hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 p-8 text-amber-100 group-hover:text-amber-200 transition-colors">
              <MapPin className="w-32 h-32 stroke-[0.75] transform translate-x-8 -translate-y-8" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200/60 inline-block mb-4">
                3 Archival Posters
              </span>
              <h3 className="text-2xl font-serif font-bold text-zinc-900 group-hover:text-amber-800 transition-colors mb-2">
                Heritage Rack Posters
              </h3>
              <p className="text-sm text-zinc-600 max-w-md">
                276 Paadal Petra Sthalam, 108 Divya Desam, and 51 Sakthi Peedam posters for temple enthusiasts & seekers.
              </p>
            </div>
            <div className="mt-8 flex items-center gap-2 text-xs font-bold text-zinc-900 uppercase tracking-widest group-hover:text-amber-800">
              <span>View Rack Posters</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </section>

      {/* Featured Products Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 pb-4 border-b border-zinc-200">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-800">
              Sriyam Essentials
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-zinc-900 mt-1">
              Featured Spiritual Products
            </h2>
          </div>
          <Link
            href="/shop"
            className="mt-4 sm:mt-0 text-xs font-bold text-zinc-700 hover:text-amber-800 uppercase tracking-wider flex items-center gap-1"
          >
            <span>View All ({products.length})</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Trust & Guarantee Section */}
      <section className="bg-zinc-900 text-white py-16 border-y border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center space-y-3 p-6 rounded-xl bg-zinc-800/40 border border-zinc-800">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-100">
                Safe & Fast Shipping
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-xs">
                Reinforced protective packaging ensuring your sacred frames arrive without damage.
              </p>
            </div>

            <div className="flex flex-col items-center space-y-3 p-6 rounded-xl bg-zinc-800/40 border border-zinc-800">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-100">
                Archival Print Quality
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-xs">
                Premium high-gsm paper and vibrant long-lasting fade-resistant inks.
              </p>
            </div>

            <div className="flex flex-col items-center space-y-3 p-6 rounded-xl bg-zinc-800/40 border border-zinc-800">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-100">
                Dedicated Support
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-xs">
                Direct WhatsApp customer care for custom orders and delivery inquiries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WhatsApp Support Callout */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-emerald-900 to-zinc-900 text-white rounded-2xl p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-2xl font-serif font-bold">Have questions or custom frame requests?</h3>
            <p className="text-xs sm:text-sm text-emerald-100/80">
              Our team is ready on WhatsApp to assist you with frame sizes, bulk inquiries, and tracking.
            </p>
          </div>
          <a
            href={`https://wa.me/${STORE_CONFIG.whatsappNumber.replace(/\+/g, '')}?text=${encodeURIComponent(STORE_CONFIG.whatsappMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3.5 bg-emerald-500 text-zinc-950 hover:bg-emerald-400 font-bold text-xs uppercase tracking-widest rounded-lg transition-colors flex items-center gap-2 shadow-lg flex-shrink-0"
          >
            <MessageCircle className="w-4 h-4 fill-zinc-950 stroke-none" />
            <span>Chat on WhatsApp</span>
          </a>
        </div>
      </section>
    </div>
  );
}

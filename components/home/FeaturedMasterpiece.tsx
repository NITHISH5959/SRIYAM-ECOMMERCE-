'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/types';
import { STORE_CONFIG } from '@/lib/config';
import { ArrowRight, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { SacredDiyaIcon, ArtFrameIcon } from '@/components/ui/SacredIcons';

interface FeaturedMasterpieceProps {
  products: Product[];
}

export default function FeaturedMasterpiece({ products }: FeaturedMasterpieceProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!products || products.length === 0) {
    return null;
  }

  const currentProduct = products[currentIndex] || products[0];
  const hasMultiple = products.length > 1;

  const nextProduct = () => {
    setCurrentIndex((prev) => (prev + 1) % products.length);
  };

  const prevProduct = () => {
    setCurrentIndex((prev) => (prev - 1 + products.length) % products.length);
  };

  const hasImage = currentProduct.images && currentProduct.images.length > 0 && currentProduct.images[0].trim() !== '';

  return (
    <div className="relative mx-auto max-w-md w-full">
      {/* Outer artisan mount with subtle double-border inspired by authentic temple framing */}
      <div className="relative bg-[#FCFAF7] p-5 sm:p-6 rounded-2xl shadow-xl border border-amber-900/15 overflow-hidden group">
        {/* Subtle traditional corner accents */}
        <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-amber-800/30" />
        <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-amber-800/30" />
        <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-amber-800/30" />
        <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-amber-800/30" />

        {/* Top Badges & Controls */}
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100/90 text-amber-950 border border-amber-300/80 rounded-md text-[11px] font-serif font-bold tracking-wider uppercase shadow-xs">
            <SacredDiyaIcon className="w-3.5 h-3.5" />
            <span>Curated Masterpiece</span>
          </div>

          {hasMultiple && (
            <div className="flex items-center gap-1.5 bg-white/80 px-2 py-0.5 rounded-full border border-stone-200/80 shadow-xs">
              <span className="text-[10px] font-serif font-semibold text-stone-500 mr-0.5">
                {currentIndex + 1} of {products.length}
              </span>
              <button
                onClick={prevProduct}
                className="p-1 rounded-full text-stone-600 hover:text-amber-900 hover:bg-stone-100 transition-colors"
                aria-label="Previous featured product"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={nextProduct}
                className="p-1 rounded-full text-stone-600 hover:text-amber-900 hover:bg-stone-100 transition-colors"
                aria-label="Next featured product"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Product Card Container */}
        <Link href={`/product/${currentProduct.slug}`} className="block group/card">
          <div className="aspect-[4/5] bg-stone-900 rounded-xl overflow-hidden relative border-2 border-amber-950/20 shadow-inner flex flex-col justify-between p-5 sm:p-6 text-center">
            {hasImage ? (
              <div className="absolute inset-0">
                <img
                  src={currentProduct.images[0]}
                  alt={currentProduct.name}
                  className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              </div>
            ) : (
              <div className="relative z-10 flex flex-col items-center justify-center my-auto">
                <div className="w-16 h-16 rounded-2xl bg-white/95 shadow-md flex items-center justify-center text-amber-800 mb-3 border border-amber-200/60">
                  {currentProduct.category?.slug === 'frames' ? (
                    <ArtFrameIcon className="w-8 h-8 text-amber-800" />
                  ) : (
                    <MapPin className="w-8 h-8 stroke-[1.5]" />
                  )}
                </div>
              </div>
            )}

            {/* Top metadata */}
            <div className="relative z-10 text-left">
              {currentProduct.category && (
                <span className={`text-[10px] font-serif font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded ${
                  hasImage ? 'bg-black/75 text-amber-200 border border-amber-500/30 backdrop-blur-sm' : 'bg-amber-100 text-amber-950 border border-amber-300/60'
                }`}>
                  {currentProduct.category.name}
                </span>
              )}
            </div>

            {/* Bottom info */}
            <div className={`relative z-10 text-left space-y-2 ${hasImage ? 'text-white' : 'text-zinc-900'}`}>
              <h3 className="text-lg sm:text-xl font-serif font-bold tracking-tight line-clamp-1 group-hover/card:text-amber-300 transition-colors">
                {currentProduct.name}
              </h3>

              {currentProduct.description && (
                <p className={`text-xs line-clamp-2 leading-relaxed ${hasImage ? 'text-zinc-200' : 'text-zinc-600'}`}>
                  {currentProduct.description}
                </p>
              )}

              {/* Price Tag & CTA */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <div className="flex items-baseline gap-2">
                  <span className={`text-lg sm:text-xl font-extrabold ${hasImage ? 'text-white' : 'text-zinc-900'}`}>
                    {STORE_CONFIG.defaultPricing.currency}{currentProduct.price}
                  </span>
                  {currentProduct.compare_at_price > currentProduct.price && (
                    <span className={`text-xs line-through ${hasImage ? 'text-zinc-400' : 'text-zinc-400'}`}>
                      {STORE_CONFIG.defaultPricing.currency}{currentProduct.compare_at_price}
                    </span>
                  )}
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-800 text-white hover:bg-amber-700 text-xs font-semibold uppercase tracking-wider rounded-lg shadow-md transition-colors">
                  <span>Explore</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover/card:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Dots indicators if multiple */}
        {hasMultiple && (
          <div className="flex items-center justify-center gap-1.5 pt-4">
            {products.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? 'w-6 bg-amber-800' : 'w-1.5 bg-zinc-200 hover:bg-zinc-300'
                }`}
                aria-label={`Go to featured product ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

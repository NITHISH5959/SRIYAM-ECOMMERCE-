'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { STORE_CONFIG } from '@/lib/config';
import PlaceholderImage from '../ui/PlaceholderImage';
import { ShoppingBag, ArrowUpRight } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();

  const price = product.price ?? STORE_CONFIG.defaultPricing.price;
  const compareAtPrice = product.compare_at_price ?? STORE_CONFIG.defaultPricing.compareAtPrice;

  // Auto-calculated discount percentage
  const discountPercentage =
    compareAtPrice > price
      ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
      : 0;

  const hasImages = product.images && product.images.length > 0 && product.images[0].trim() !== '';

  return (
    <div className="group relative bg-white border border-zinc-200/80 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-300 flex flex-col justify-between">
      {/* Discount Badge */}
      {discountPercentage > 0 && (
        <div className="absolute top-3 left-3 z-10 bg-amber-700 text-white text-[10px] font-bold px-2 py-0.5 rounded tracking-wide uppercase shadow-sm">
          {discountPercentage}% OFF
        </div>
      )}

      {/* Category Tag */}
      {product.category?.name && (
        <div className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur-sm text-zinc-700 text-[10px] font-medium px-2 py-0.5 rounded border border-zinc-200/80">
          {product.category.name}
        </div>
      )}

      {/* Image Container */}
      <Link href={`/product/${product.slug}`} className="block relative overflow-hidden bg-zinc-50 aspect-[4/5]">
        {hasImages ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            unoptimized={product.images[0].startsWith('blob:') || product.images[0].startsWith('data:')}
          />
        ) : (
          <PlaceholderImage
            title={product.name}
            category={product.category?.name || 'Sacred Collection'}
            className="h-full"
          />
        )}
      </Link>

      {/* Product Information */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <Link href={`/product/${product.slug}`}>
            <h3 className="text-sm font-semibold text-zinc-900 group-hover:text-amber-800 transition-colors line-clamp-1 flex items-center justify-between">
              <span>{product.name}</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-amber-700" />
            </h3>
          </Link>
          {product.description && (
            <p className="text-xs text-zinc-500 line-clamp-1 mt-1 font-normal">
              {product.description}
            </p>
          )}
        </div>

        {/* Pricing & Cart Action */}
        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-zinc-900">
              {STORE_CONFIG.defaultPricing.currency}{price.toLocaleString()}
            </span>
            {compareAtPrice > price && (
              <span className="text-xs text-zinc-400 line-through font-normal">
                {STORE_CONFIG.defaultPricing.currency}{compareAtPrice.toLocaleString()}
              </span>
            )}
          </div>

          <button
            onClick={() => addToCart(product, 1)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white hover:bg-amber-800 rounded-lg text-xs font-semibold tracking-wide transition-colors shadow-sm"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
      </div>
    </div>
  );
}

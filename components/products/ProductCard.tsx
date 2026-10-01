'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { STORE_CONFIG } from '@/lib/config';
import PlaceholderImage from '../ui/PlaceholderImage';
import { ShoppingBag, ArrowUpRight, Layers, Check } from 'lucide-react';
import { useAddFeedback } from '@/hooks/useAddFeedback';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart, cart } = useCart();
  const isFrame = product.category?.slug === 'frames';
  const isInCart = !isFrame && cart.some(i => i.product.id === product.id);
  const { isAdded, trigger } = useAddFeedback(() => addToCart(product, 1));

  const price = product.price ?? STORE_CONFIG.defaultPricing.price;
  const compareAtPrice = product.compare_at_price ?? STORE_CONFIG.defaultPricing.compareAtPrice;

  // Auto-calculated discount percentage (not shown for Frames since price varies by size)
  const discountPercentage =
    !isFrame && compareAtPrice > price
      ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
      : 0;

  const variants = product.variants || [];
  const isOutOfStock = isFrame
    ? (variants.length > 0 ? variants.every((v) => (v.stock ?? 0) <= 0) : (product.stock ?? 0) <= 0)
    : (product.stock ?? 0) <= 0;

  const hasImages = product.images && product.images.length > 0 && product.images[0].trim() !== '';

  return (
    <div className="group relative bg-white border border-zinc-200/80 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-300 flex flex-col justify-between">
      {/* Badges: Out of Stock takes precedence, then Discount */}
      {isOutOfStock ? (
        <div className="absolute top-3 left-3 z-10 bg-zinc-800 text-zinc-200 text-[10px] font-bold px-2 py-0.5 rounded tracking-wide uppercase shadow-sm">
          Out of Stock
        </div>
      ) : discountPercentage > 0 ? (
        <div className="absolute top-3 left-3 z-10 bg-amber-700 text-white text-[10px] font-bold px-2 py-0.5 rounded tracking-wide uppercase shadow-sm">
          {discountPercentage}% OFF
        </div>
      ) : null}

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
            className={`object-cover group-hover:scale-105 transition-transform duration-500 ${isOutOfStock ? 'grayscale opacity-75' : ''}`}
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
            {isFrame ? (
              <span className="text-sm font-bold text-zinc-900">
                <span className="text-[11px] font-normal text-zinc-500 mr-0.5">From</span>
                {STORE_CONFIG.defaultPricing.currency}{price.toLocaleString()}
              </span>
            ) : (
              <>
                <span className="text-sm font-bold text-zinc-900">
                  {STORE_CONFIG.defaultPricing.currency}{price.toLocaleString()}
                </span>
                {compareAtPrice > price && (
                  <span className="text-xs text-zinc-400 line-through font-normal">
                    {STORE_CONFIG.defaultPricing.currency}{compareAtPrice.toLocaleString()}
                  </span>
                )}
              </>
            )}
          </div>

          {isOutOfStock ? (
            <button
              disabled
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-400 rounded-lg text-xs font-semibold tracking-wide cursor-not-allowed border border-zinc-200"
            >
              <span>Out of Stock</span>
            </button>
          ) : isFrame ? (
            // Frames require size selection on the PDP before adding to cart
            <Link
              href={`/product/${product.slug}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white hover:bg-amber-800 rounded-lg text-xs font-semibold tracking-wide transition-colors shadow-sm"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Select Size</span>
            </Link>
          ) : isInCart ? (
            <Link
              href="/cart"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-800 text-white hover:bg-amber-900 rounded-lg text-xs font-semibold tracking-wide transition-colors shadow-sm"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Go to Cart</span>
            </Link>
          ) : (
            <button
              onClick={trigger}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-sm select-none ${
                isAdded
                  ? 'bg-amber-800 text-white animate-btn-success'
                  : 'bg-zinc-900 text-white hover:bg-amber-800'
              }`}
            >
              {isAdded ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Added</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Add</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

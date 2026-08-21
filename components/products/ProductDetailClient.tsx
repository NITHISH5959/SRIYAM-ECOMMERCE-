'use client';

import React, { useState } from 'react';
import { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { STORE_CONFIG } from '@/lib/config';
import PlaceholderImage from '../ui/PlaceholderImage';
import Image from 'next/image';
import {
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle2,
  Truck,
  ShieldCheck,
  RotateCcw,
  MessageCircle,
  Share2,
} from 'lucide-react';
import Link from 'next/link';

interface ProductDetailClientProps {
  product: Product;
  relatedProducts: Product[];
}

export default function ProductDetailClient({
  product,
  relatedProducts,
}: ProductDetailClientProps) {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const price = product.price ?? STORE_CONFIG.defaultPricing.price;
  const compareAtPrice = product.compare_at_price ?? STORE_CONFIG.defaultPricing.compareAtPrice;

  const discountPercentage =
    compareAtPrice > price
      ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
      : 0;

  const hasImages = product.images && product.images.length > 0 && product.images[0].trim() !== '';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      {/* Breadcrumb */}
      <div className="text-xs text-zinc-500 flex items-center gap-2">
        <Link href="/" className="hover:text-zinc-900 transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link href="/shop" className="hover:text-zinc-900 transition-colors">
          Shop
        </Link>
        <span>/</span>
        <span className="text-zinc-900 font-medium truncate max-w-xs">{product.name}</span>
      </div>

      {/* Main Product Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
        {/* Left Column: Image Gallery */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl overflow-hidden aspect-[4/5] relative">
            {hasImages ? (
              <Image
                src={product.images[selectedImageIndex]}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                unoptimized={product.images[selectedImageIndex].startsWith('blob:') || product.images[selectedImageIndex].startsWith('data:')}
                priority
              />
            ) : (
              <PlaceholderImage
                title={product.name}
                category={product.category?.name || 'Sacred Art'}
                className="h-full"
              />
            )}

            {discountPercentage > 0 && (
              <span className="absolute top-4 left-4 bg-amber-700 text-white text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wider shadow-md">
                {discountPercentage}% OFF
              </span>
            )}
          </div>

          {/* Thumbnails if multiple images exist */}
          {hasImages && product.images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-20 h-24 rounded-lg overflow-hidden border-2 transition-all relative ${
                    selectedImageIndex === idx
                      ? 'border-amber-700 ring-2 ring-amber-700/20'
                      : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <Image
                    src={img}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                    unoptimized={img.startsWith('blob:') || img.startsWith('data:')}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Product Details & Purchase Actions */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Category Tag */}
            {product.category?.name && (
              <span className="inline-block text-xs font-semibold uppercase tracking-widest text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200/80">
                {product.category.name}
              </span>
            )}

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-zinc-900 leading-tight">
              {product.name}
            </h1>

            {/* Pricing Breakdown */}
            <div className="flex items-baseline gap-3 pt-2">
              <span className="text-3xl font-extrabold text-zinc-900">
                {STORE_CONFIG.defaultPricing.currency}
                {price.toLocaleString()}
              </span>
              {compareAtPrice > price && (
                <span className="text-lg text-zinc-400 line-through font-normal">
                  {STORE_CONFIG.defaultPricing.currency}
                  {compareAtPrice.toLocaleString()}
                </span>
              )}
              {discountPercentage > 0 && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded">
                  Save {STORE_CONFIG.defaultPricing.currency}
                  {(compareAtPrice - price).toLocaleString()}
                </span>
              )}
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-2 pt-1">
              {product.stock > 0 ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                    In Stock ({product.stock} units available)
                  </span>
                </>
              ) : (
                <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                  Out of Stock
                </span>
              )}
            </div>

            {/* Description */}
            <div className="border-t border-zinc-200 pt-4 text-sm text-zinc-600 leading-relaxed">
              <p>
                {product.description ||
                  `Exquisite ${product.name} spiritual artwork crafted with utmost reverence. Printed on high-gsm archival stock with vibrant fade-resistant finish.`}
              </p>
            </div>

            {/* Quantity Selector & Add to Cart */}
            <div className="pt-6 space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Quantity:
                </span>
                <div className="flex items-center border border-zinc-300 rounded-lg bg-zinc-50">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2.5 text-zinc-600 hover:bg-zinc-200 transition-colors rounded-l-lg"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 text-sm font-bold text-zinc-900">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2.5 text-zinc-600 hover:bg-zinc-200 transition-colors rounded-r-lg"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button
                onClick={() => addToCart(product, quantity)}
                disabled={product.stock <= 0}
                className="w-full py-4 bg-zinc-900 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-amber-800 disabled:opacity-50 transition-colors shadow-lg flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add {quantity} to Cart</span>
              </button>
            </div>
          </div>

          {/* Value Props & Specs Accordion */}
          <div className="border-t border-zinc-200 pt-6 space-y-4 text-xs text-zinc-600">
            <div className="grid grid-cols-2 gap-4 bg-zinc-50 p-4 rounded-xl border border-zinc-200/80">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-700 flex-shrink-0" />
                <span>Free shipping &gt; ₹999</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700 flex-shrink-0" />
                <span>Damaged item replacement guarantee</span>
              </div>
            </div>

            {/* Specifications Table */}
            <div className="space-y-2 pt-2">
              <h4 className="font-bold text-zinc-900 uppercase tracking-wider text-[11px]">
                Specifications:
              </h4>
              <div className="grid grid-cols-2 gap-y-1 text-[11px]">
                <span className="text-zinc-400">Weight:</span>
                <span className="font-medium text-zinc-800">{product.weight_grams || 300} grams</span>
                <span className="text-zinc-400">Category:</span>
                <span className="font-medium text-zinc-800">{product.category?.name || 'Spiritual'}</span>
                <span className="text-zinc-400">Print Quality:</span>
                <span className="font-medium text-zinc-800">High-GSM Fine Archival Stock</span>
              </div>
            </div>

            {/* WhatsApp Inquiry */}
            <div className="pt-4 flex items-center justify-between">
              <a
                href={`https://wa.me/${STORE_CONFIG.whatsappNumber.replace(/\+/g, '')}?text=${encodeURIComponent(`Hi Sriyam Store, I am interested in ${product.name}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4 fill-emerald-60 text-emerald-700" />
                <span>Inquire about custom sizes on WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="pt-12 border-t border-zinc-200">
          <h2 className="text-2xl font-serif font-bold text-zinc-900 mb-6">
            More from {product.category?.name || 'Sacred Collection'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {relatedProducts.map((rel) => (
              <div key={rel.id} className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
                <Link href={`/product/${rel.slug}`} className="block font-semibold text-sm text-zinc-900 hover:text-amber-800">
                  {rel.name}
                </Link>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold">{STORE_CONFIG.defaultPricing.currency}{rel.price}</span>
                  <Link href={`/product/${rel.slug}`} className="text-amber-700 hover:underline font-semibold">
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

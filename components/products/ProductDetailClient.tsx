'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Product, ProductVariant } from '@/types';
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
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import Link from 'next/link';
import { useAddFeedback } from '@/hooks/useAddFeedback';

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

  // ── Variant / size selection (Frames only) ────────────────────────────────
  const isFrame = product.category?.slug === 'frames';
  const variants: ProductVariant[] = product.variants || [];
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  // Derived price / stock from selected variant or product
  const price = selectedVariant
    ? selectedVariant.price
    : product.price ?? STORE_CONFIG.defaultPricing.price;
  const compareAtPrice = selectedVariant
    ? selectedVariant.compare_at_price
    : product.compare_at_price ?? STORE_CONFIG.defaultPricing.compareAtPrice;
  const stockForDisplay = selectedVariant ? selectedVariant.stock : product.stock;

  const discountPercentage =
    compareAtPrice > price
      ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
      : 0;

  const hasImages = product.images && product.images.length > 0 && product.images[0].trim() !== '';
  const totalImages = hasImages ? product.images.length : 0;
  const multiImage = totalImages > 1;

  // ── Navigation helpers ──────────────────────────────────────────────────────
  const goToPrev = useCallback(() => {
    setSelectedImageIndex((i) => (i > 0 ? i - 1 : totalImages - 1));
  }, [totalImages]);

  const goToNext = useCallback(() => {
    setSelectedImageIndex((i) => (i < totalImages - 1 ? i + 1 : 0));
  }, [totalImages]);

  // ── Keyboard navigation ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!multiImage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [multiImage, goToPrev, goToNext]);

  // ── Touch / Swipe support ───────────────────────────────────────────────────
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null || !multiImage) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Only trigger swipe if horizontal movement dominates (avoids conflict with page scroll)
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) goToNext();
      else goToPrev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // ── Add to cart handler ─────────────────────────────────────────────────────
  const handleAddToCart = () => {
    if (isFrame) {
      if (!selectedVariant) return; // button is disabled anyway
      addToCart(
        product,
        quantity,
        selectedVariant.size,
        selectedVariant.id,
        selectedVariant.stock,
        selectedVariant.price
      );
    } else {
      addToCart(product, quantity);
    }
  };

  const { isAdded, trigger } = useAddFeedback(handleAddToCart);

  // Add-to-cart button disabled state
  const isAddDisabled =
    (isFrame && !selectedVariant) ||
    (isFrame && selectedVariant ? selectedVariant.stock <= 0 : !isFrame && product.stock <= 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      {/* Breadcrumb */}
      <div className="text-xs text-zinc-500 flex items-center gap-2">
        <Link href="/" className="hover:text-zinc-900 transition-colors">Home</Link>
        <span>/</span>
        <Link href="/shop" className="hover:text-zinc-900 transition-colors">Shop</Link>
        <span>/</span>
        <span className="text-zinc-900 font-medium truncate max-w-xs">{product.name}</span>
      </div>

      {/* Main Product Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
        {/* Left Column: Image Gallery */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main Image */}
          <div
            className="bg-zinc-50 border border-zinc-200 rounded-2xl overflow-hidden aspect-[4/5] relative"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {hasImages ? (
              <Image
                src={product.images[selectedImageIndex]}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 58vw"
                className="object-cover"
                unoptimized={
                  product.images[selectedImageIndex].startsWith('blob:') ||
                  product.images[selectedImageIndex].startsWith('data:')
                }
                priority
              />
            ) : (
              <PlaceholderImage
                title={product.name}
                category={product.category?.name || 'Sacred Art'}
                className="h-full"
              />
            )}

            {/* Discount badge */}
            {discountPercentage > 0 && (
              <span className="absolute top-4 left-4 bg-amber-700 text-white text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wider shadow-md">
                {discountPercentage}% OFF
              </span>
            )}

            {/* Left / Right arrow buttons (desktop) — only when multiple images */}
            {multiImage && (
              <>
                <button
                  onClick={goToPrev}
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 border border-zinc-200 text-zinc-700 hover:bg-white hover:text-zinc-900 flex items-center justify-center shadow-sm transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={goToNext}
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 border border-zinc-200 text-zinc-700 hover:bg-white hover:text-zinc-900 flex items-center justify-center shadow-sm transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Dot indicator */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                  {product.images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      aria-label={`Go to image ${idx + 1}`}
                      className={`rounded-full transition-all ${
                        selectedImageIndex === idx
                          ? 'w-4 h-1.5 bg-amber-700'
                          : 'w-1.5 h-1.5 bg-white/60 hover:bg-white/90'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Thumbnail strip — only when multiple images */}
          {multiImage && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  aria-label={`View image ${idx + 1}`}
                  className={`flex-shrink-0 w-20 h-24 rounded-lg overflow-hidden border-2 transition-all relative ${
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
                    loading={idx === 0 ? 'eager' : 'lazy'}
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
              {isFrame && !selectedVariant ? (
                <span className="text-2xl font-extrabold text-zinc-900">
                  <span className="text-base font-normal text-zinc-500 mr-1">From</span>
                  {STORE_CONFIG.defaultPricing.currency}{product.price.toLocaleString()}
                </span>
              ) : (
                <>
                  <span className="text-3xl font-extrabold text-zinc-900">
                    {STORE_CONFIG.defaultPricing.currency}{price.toLocaleString()}
                  </span>
                  {compareAtPrice > price && (
                    <span className="text-lg text-zinc-400 line-through font-normal">
                      {STORE_CONFIG.defaultPricing.currency}{compareAtPrice.toLocaleString()}
                    </span>
                  )}
                  {discountPercentage > 0 && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded">
                      Save {STORE_CONFIG.defaultPricing.currency}{(compareAtPrice - price).toLocaleString()}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* ── Size Selector (Frames only) ──────────────────────────────── */}
            {isFrame && variants.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-amber-800" />
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                    Size
                    {selectedVariant && (
                      <span className="ml-2 font-normal text-zinc-500 normal-case tracking-normal">
                        — {selectedVariant.size} selected
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex gap-3">
                  {variants.map((v) => {
                    const isSelected = selectedVariant?.id === v.id;
                    const isOos = v.stock <= 0;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={isOos}
                        onClick={() => setSelectedVariant(v)}
                        className={`relative px-5 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                          isSelected
                            ? 'border-amber-700 bg-amber-50 text-amber-900 shadow-sm'
                            : isOos
                            ? 'border-zinc-200 bg-zinc-50 text-zinc-300 cursor-not-allowed line-through'
                            : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500 hover:text-zinc-900'
                        }`}
                      >
                        {v.size}
                        <span className="block text-[10px] font-normal mt-0.5 text-current opacity-70">
                          {isOos ? 'Out of stock' : `₹${v.price.toLocaleString()}`}
                        </span>
                        {isSelected && (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-700 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {!selectedVariant && (
                  <p className="text-[11px] text-amber-700 font-medium">
                    ↑ Please select a size to add to cart
                  </p>
                )}
              </div>
            )}

            {/* Stock Status */}
            <div className="flex items-center gap-2 pt-1">
              {selectedVariant ? (
                selectedVariant.stock > 0 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                      In Stock ({selectedVariant.stock} units available)
                    </span>
                  </>
                ) : (
                  <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                    Out of Stock — {selectedVariant.size}
                  </span>
                )
              ) : !isFrame ? (
                product.stock > 0 ? (
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
                )
              ) : null}
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
                    onClick={() => {
                      const maxQty = Math.min(5, stockForDisplay);
                      setQuantity(Math.min(quantity + 1, maxQty > 0 ? maxQty : 5));
                    }}
                    disabled={quantity >= Math.min(5, stockForDisplay > 0 ? stockForDisplay : 5)}
                    className="p-2.5 text-zinc-600 hover:bg-zinc-200 transition-colors rounded-r-lg disabled:opacity-40"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button
                onClick={trigger}
                disabled={isAddDisabled}
                className={`w-full py-4 font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 select-none ${
                  isAdded
                    ? 'bg-amber-800 text-white animate-btn-success'
                    : 'bg-zinc-900 text-white hover:bg-amber-800 disabled:opacity-50'
                }`}
              >
                {isAdded ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Added to Cart</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>
                      {isFrame && !selectedVariant
                        ? 'Select a Size to Add to Cart'
                        : `Add ${quantity} to Cart`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Value Props & Specs */}
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
                {isFrame && (
                  <>
                    <span className="text-zinc-400">Available Sizes:</span>
                    <span className="font-medium text-zinc-800">
                      {variants.map(v => v.size).join(', ')}
                    </span>
                  </>
                )}
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
            {relatedProducts.map((rel) => {
              const relIsFrame = rel.category?.slug === 'frames';
              return (
                <div key={rel.id} className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
                  {/* Related product thumbnail */}
                  {rel.images && rel.images.length > 0 && rel.images[0].trim() !== '' ? (
                    <Link href={`/product/${rel.slug}`} className="block relative aspect-[4/5] bg-zinc-50">
                      <Image
                        src={rel.images[0]}
                        alt={rel.name}
                        fill
                        sizes="(max-width: 640px) 50vw, 25vw"
                        className="object-cover hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        unoptimized={rel.images[0].startsWith('blob:') || rel.images[0].startsWith('data:')}
                      />
                    </Link>
                  ) : (
                    <Link href={`/product/${rel.slug}`} className="block aspect-[4/5]">
                      <PlaceholderImage
                        title={rel.name}
                        category={rel.category?.name || 'Sacred'}
                        className="h-full"
                      />
                    </Link>
                  )}
                  <div className="p-3 space-y-1">
                    <Link href={`/product/${rel.slug}`} className="block font-semibold text-sm text-zinc-900 hover:text-amber-800 line-clamp-1">
                      {rel.name}
                    </Link>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold">
                        {relIsFrame && <span className="font-normal text-zinc-400 text-[10px] mr-0.5">From</span>}
                        {STORE_CONFIG.defaultPricing.currency}{rel.price}
                      </span>
                      <Link href={`/product/${rel.slug}`} className="text-amber-700 hover:underline font-semibold">
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

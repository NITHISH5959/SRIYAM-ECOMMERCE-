'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { STORE_CONFIG } from '@/lib/config';
import { getProducts } from '@/lib/data';
import { Product } from '@/types';
import PlaceholderImage from '@/components/ui/PlaceholderImage';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Tag,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const {
    cart,
    removeFromCart,
    updateQuantity,
    subtotal,
    clearCart,
    coupon,
    couponCode,
    setCouponCode,
    discountAmount,
    isFreeShippingCoupon,
    couponMessage,
    applyCoupon,
    removeCoupon,
    user,
  } = useCart();

  const [inputCode, setInputCode] = useState(couponCode || '');
  const [isApplying, setIsApplying] = useState(false);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);

  // Calculate Shipping fee
  const isFreeShipping = subtotal >= STORE_CONFIG.freeShippingThreshold || isFreeShippingCoupon;
  const shippingFee = isFreeShipping ? 0 : STORE_CONFIG.defaultShippingFee;
  const totalAmount = Math.max(0, subtotal - discountAmount) + shippingFee;

  // Load "You May Also Like" products (4 items excluding cart items)
  useEffect(() => {
    getProducts().then((allProducts) => {
      const cartIds = new Set(cart.map((item) => item.product.id));
      const filtered = allProducts.filter((p) => !cartIds.has(p.id)).slice(0, 4);
      setRecommendedProducts(filtered);
    });
  }, [cart]);

  const handleApplyCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsApplying(true);
    await applyCoupon(inputCode);
    setIsApplying(false);
  };

  const handleProceedToCheckout = () => {
    if (!user) {
      router.push('/login?redirect=/checkout');
    } else {
      router.push('/checkout');
    }
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-md mx-auto text-center space-y-6 bg-white p-10 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-800 border border-amber-200/60">
            <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-serif font-bold text-zinc-900">Your Cart is Empty</h1>
            <p className="text-xs text-zinc-500 max-w-xs mx-auto">
              Explore our collection of sacred art frames and Paadal Petra Sthalam posters.
            </p>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-zinc-900 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-amber-800 transition-colors shadow-md"
          >
            <span>Start Shopping</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Header */}
      <div className="border-b border-zinc-200 pb-6">
        <div className="text-xs text-zinc-500 flex items-center gap-2 mb-2">
          <Link href="/" className="hover:text-zinc-900 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-zinc-900 font-medium">Shopping Cart</span>
        </div>
        <h1 className="text-3xl font-serif font-bold text-zinc-900">
          Shopping Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Cart Line Items */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden divide-y divide-zinc-100">
            {cart.map(({ product, quantity }) => {
              const maxStock = product.stock > 0 ? Math.min(5, product.stock) : 0;
              const hasImages = product.images && product.images.length > 0 && product.images[0].trim() !== '';

              return (
                <div key={product.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:bg-zinc-50/50 transition-colors">
                  {/* Image & Title */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-20 h-24 bg-zinc-100 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-200 flex items-center justify-center">
                      {hasImages ? (
                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <PlaceholderImage title={product.name} category={product.category?.name || ''} className="h-full" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                        {product.category?.name || 'Spiritual'}
                      </span>
                      <Link href={`/product/${product.slug}`} className="block font-semibold text-sm text-zinc-900 hover:text-amber-800 transition-colors">
                        {product.name}
                      </Link>
                      <p className="text-xs font-bold text-zinc-900">
                        {STORE_CONFIG.defaultPricing.currency}{product.price.toLocaleString()}
                        {product.compare_at_price > product.price && (
                          <span className="text-[11px] text-zinc-400 line-through font-normal ml-2">
                            {STORE_CONFIG.defaultPricing.currency}{product.compare_at_price.toLocaleString()}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="flex items-center border border-zinc-300 rounded-lg bg-zinc-50">
                      <button
                        onClick={() => updateQuantity(product.id, quantity - 1)}
                        className="px-3 py-1.5 text-zinc-600 hover:bg-zinc-200 transition-colors rounded-l-lg"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-xs font-bold text-zinc-900">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(product.id, quantity + 1)}
                        disabled={quantity >= maxStock}
                        className="px-3 py-1.5 text-zinc-600 hover:bg-zinc-200 transition-colors rounded-r-lg disabled:opacity-40"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Line Total */}
                    <div className="text-right min-w-[80px]">
                      <span className="text-sm font-extrabold text-zinc-900">
                        {STORE_CONFIG.defaultPricing.currency}{(product.price * quantity).toLocaleString()}
                      </span>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeFromCart(product.id)}
                      className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={clearCart}
              className="text-xs font-semibold text-zinc-500 hover:text-red-600 underline"
            >
              Clear Cart
            </button>
            <Link href="/shop" className="text-xs font-bold text-amber-800 hover:underline">
              ← Continue Shopping
            </Link>
          </div>
        </div>

        {/* Right: Cart Summary & Coupon Section */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-6">
            <h3 className="font-serif font-bold text-lg text-zinc-900 border-b border-zinc-100 pb-4">
              Order Summary
            </h3>

            {/* Coupon Code Input */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-800" />
                <span>Apply Coupon Code</span>
              </label>

              {coupon ? (
                <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs">
                  <div>
                    <span className="font-mono font-bold text-amber-900 uppercase">
                      {coupon.code}
                    </span>
                    <p className="text-[11px] text-amber-700 font-medium">
                      {coupon.type === 'free_shipping' ? 'Free Shipping Applied' : `₹${discountAmount} Discount Applied`}
                    </p>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="p-1 text-amber-700 hover:text-red-600 rounded-full"
                    title="Remove coupon"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCouponSubmit} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter SRIYAM10, FLAT50..."
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                      className="flex-1 border border-zinc-300 rounded-lg px-3 py-2 text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-amber-700 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isApplying}
                      className="px-4 py-2 bg-zinc-900 text-white font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-amber-800 transition-colors disabled:opacity-50"
                    >
                      {isApplying ? 'Applying...' : 'Apply'}
                    </button>
                  </div>
                </form>
              )}

              {/* Coupon Feedback Message */}
              {couponMessage && (
                <div
                  className={`p-3 rounded-lg text-xs font-medium flex items-start gap-2 ${
                    couponMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {couponMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <span>{couponMessage.text}</span>
                </div>
              )}
            </div>

            {/* Price Calculations */}
            <div className="space-y-3 pt-4 border-t border-zinc-100 text-xs">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal</span>
                <span className="font-semibold text-zinc-900">
                  {STORE_CONFIG.defaultPricing.currency}{subtotal.toLocaleString()}
                </span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Coupon Discount</span>
                  <span>-{STORE_CONFIG.defaultPricing.currency}{discountAmount.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between text-zinc-600">
                <span>Estimated Shipping</span>
                <span className="font-semibold text-zinc-900">
                  {isFreeShipping ? (
                    <span className="text-emerald-700 font-bold uppercase">Free</span>
                  ) : (
                    `${STORE_CONFIG.defaultPricing.currency}${shippingFee}`
                  )}
                </span>
              </div>

              <div className="pt-3 border-t border-zinc-200 flex justify-between items-baseline text-base font-extrabold text-zinc-900">
                <span>Order Total</span>
                <span className="text-xl text-amber-900">
                  {STORE_CONFIG.defaultPricing.currency}{totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Checkout Action Button */}
            <button
              onClick={handleProceedToCheckout}
              className="w-full py-4 bg-zinc-900 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-amber-800 transition-colors shadow-lg flex items-center justify-center gap-2 group"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            {!user && (
              <p className="text-[11px] text-zinc-500 text-center">
                🔒 You will be asked to log in or create an account to complete your order.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* "You May Also Like" Section */}
      {recommendedProducts.length > 0 && (
        <div className="pt-12 border-t border-zinc-200 space-y-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-700" />
            <h2 className="text-xl font-serif font-bold text-zinc-900">You May Also Like</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {recommendedProducts.map((p) => {
              const hasImages = p.images && p.images.length > 0 && p.images[0].trim() !== '';
              return (
                <div key={p.id} className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm p-3 flex flex-col justify-between">
                  <Link href={`/product/${p.slug}`} className="block aspect-square bg-zinc-50 rounded-lg overflow-hidden mb-3">
                    {hasImages ? (
                      <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <PlaceholderImage title={p.name} category={p.category?.name || ''} className="h-full" />
                    )}
                  </Link>
                  <div className="space-y-2">
                    <Link href={`/product/${p.slug}`} className="block font-semibold text-xs text-zinc-900 hover:text-amber-800 line-clamp-1">
                      {p.name}
                    </Link>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-zinc-900">{STORE_CONFIG.defaultPricing.currency}{p.price}</span>
                      <Link href={`/product/${p.slug}`} className="text-[11px] font-bold text-amber-800 hover:underline">
                        View Item
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

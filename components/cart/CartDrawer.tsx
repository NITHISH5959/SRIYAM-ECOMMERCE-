'use client';

import React from 'react';
import { useCart } from '@/context/CartContext';
import { STORE_CONFIG } from '@/lib/config';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function CartDrawer() {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
    subtotal,
    clearCart,
  } = useCart();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-700" />
              <h3 className="font-semibold text-zinc-900 text-lg">Your Shopping Cart</h3>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {cart.length === 0 ? (
              <div className="text-center py-16 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 mb-4">
                  <ShoppingBag className="w-8 h-8 stroke-[1.25]" />
                </div>
                <p className="text-zinc-600 font-medium mb-1">Your cart is empty</p>
                <p className="text-xs text-zinc-400 max-w-xs mb-6">
                  Explore our collection of sacred art frames & heritage posters.
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="px-6 py-2.5 bg-zinc-900 text-white text-xs font-semibold uppercase tracking-wider rounded-md hover:bg-zinc-800 transition-colors"
                >
                  Browse Store
                </button>
              </div>
            ) : (
              cart.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className="flex gap-4 pb-6 border-b border-zinc-100 last:border-0 last:pb-0"
                >
                  <div className="w-20 h-24 bg-zinc-100 rounded-md overflow-hidden flex-shrink-0 relative flex items-center justify-center text-zinc-400 text-xs font-mono border border-zinc-200/60">
                    {product.images && product.images.length > 0 ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized={product.images[0].startsWith('blob:') || product.images[0].startsWith('data:')}
                      />
                    ) : (
                      <span className="text-[10px] text-zinc-500 font-semibold px-2 text-center">
                        {product.name}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-semibold text-zinc-900 line-clamp-1">
                          {product.name}
                        </h4>
                        <button
                          onClick={() => removeFromCart(product.id)}
                          className="text-zinc-400 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-amber-800 font-medium mt-0.5">
                        {STORE_CONFIG.defaultPricing.currency}{product.price.toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-zinc-200 rounded-md bg-zinc-50">
                        <button
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          className="px-2.5 py-1 text-zinc-600 hover:bg-zinc-200 transition-colors rounded-l-md"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 text-xs font-semibold text-zinc-800">
                          {quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          className="px-2.5 py-1 text-zinc-600 hover:bg-zinc-200 transition-colors rounded-r-md"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-xs font-semibold text-zinc-900">
                        {STORE_CONFIG.defaultPricing.currency}
                        {(product.price * quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {cart.length > 0 && (
            <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 space-y-4">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-zinc-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-zinc-900">
                    {STORE_CONFIG.defaultPricing.currency}{subtotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Shipping</span>
                  <span className="font-medium text-emerald-600">
                    {subtotal >= STORE_CONFIG.freeShippingThreshold ? 'FREE' : `${STORE_CONFIG.defaultPricing.currency}${STORE_CONFIG.defaultShippingFee}`}
                  </span>
                </div>
                <div className="pt-2 border-t border-zinc-200 flex justify-between text-sm font-semibold text-zinc-900">
                  <span>Total</span>
                  <span>
                    {STORE_CONFIG.defaultPricing.currency}
                    {(
                      subtotal +
                      (subtotal >= STORE_CONFIG.freeShippingThreshold
                        ? 0
                        : STORE_CONFIG.defaultShippingFee)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={clearCart}
                  className="w-full py-2.5 border border-zinc-300 text-zinc-700 text-xs font-semibold rounded-md hover:bg-zinc-100 transition-colors uppercase tracking-wider"
                >
                  Clear Cart
                </button>
                <Link
                  href="/shop"
                  onClick={() => setIsCartOpen(false)}
                  className="w-full py-2.5 bg-zinc-900 text-white text-xs font-semibold rounded-md hover:bg-zinc-800 transition-colors uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  Checkout <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

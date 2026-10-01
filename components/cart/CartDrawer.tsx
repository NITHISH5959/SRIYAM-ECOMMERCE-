'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { STORE_CONFIG } from '@/lib/config';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, AlertTriangle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface StockErrorItem {
  product_id: string;
  variant_id?: string;
  size?: string;
  code: string;
  message: string;
  available_stock: number;
  requested_quantity: number;
}

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

  const [stockErrors, setStockErrors] = useState<StockErrorItem[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  // Validate stock whenever the drawer is opened or cart items change
  useEffect(() => {
    if (!isCartOpen || cart.length === 0) {
      setStockErrors([]);
      return;
    }

    let isMounted = true;
    setIsValidating(true);

    const payload = cart.map((item) => ({
      product_id: item.product.id,
      variant_id: item.variantId,
      size: item.size,
      quantity: item.quantity,
      name: item.product.name,
    }));

    fetch('/api/stock/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: payload }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          if (data && Array.isArray(data.errors)) {
            setStockErrors(data.errors);
          } else {
            setStockErrors([]);
          }
          setIsValidating(false);
        }
      })
      .catch((err) => {
        console.error('Failed to validate stock in CartDrawer', err);
        if (isMounted) setIsValidating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isCartOpen, cart]);

  const hasStockIssues = stockErrors.length > 0;

  const getLineError = (productId: string, size?: string) => {
    return stockErrors.find(
      (err) =>
        err.product_id === productId &&
        ((!err.size && !size) || err.size === size)
    );
  };

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

          {/* Stock Issue Top Banner */}
          {hasStockIssues && (
            <div className="p-3 bg-red-50 border-b border-red-200 text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>Some items have stock limits. Please update your cart to proceed.</span>
            </div>
          )}

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
              cart.map(({ product, quantity, size }) => {
                const lineErr = getLineError(product.id, size);
                const isOutOfStock = lineErr && lineErr.available_stock === 0;
                const isInsufficient = lineErr && lineErr.available_stock > 0 && quantity > lineErr.available_stock;

                return (
                  <div
                    key={`${product.id}__${size || ''}`}
                    className={`flex flex-col gap-2 pb-6 border-b border-zinc-100 last:border-0 last:pb-0 ${
                      lineErr ? 'bg-red-50/50 p-3 rounded-xl border border-red-200' : ''
                    }`}
                  >
                    <div className="flex gap-4">
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
                            <div>
                              <h4 className="text-sm font-semibold text-zinc-900 line-clamp-1">
                                {product.name}
                              </h4>
                              {size && (
                                <span className="inline-block text-[11px] font-medium text-zinc-500">
                                  Size: {size}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => removeFromCart(product.id, size)}
                              className="text-zinc-400 hover:text-red-500 transition-colors p-1"
                              title="Remove item"
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
                              onClick={() => updateQuantity(product.id, quantity - 1, size)}
                              className="px-2.5 py-1 text-zinc-600 hover:bg-zinc-200 transition-colors rounded-l-md"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-3 text-xs font-semibold text-zinc-800">
                              {quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(product.id, quantity + 1, size)}
                              disabled={Boolean(lineErr && quantity >= lineErr.available_stock)}
                              className="px-2.5 py-1 text-zinc-600 hover:bg-zinc-200 transition-colors rounded-r-md disabled:opacity-40"
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

                    {/* Line Stock Alert & Quick Actions */}
                    {lineErr && (
                      <div className="mt-1 pt-2 border-t border-red-200/80 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-red-700 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>
                            {isOutOfStock
                              ? 'Out of stock'
                              : isInsufficient
                              ? `Only ${lineErr.available_stock} left in stock`
                              : lineErr.message}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isInsufficient && lineErr.available_stock > 0 && (
                            <button
                              onClick={() => updateQuantity(product.id, lineErr.available_stock, size)}
                              className="text-[11px] font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded transition-colors"
                            >
                              Reduce to {lineErr.available_stock}
                            </button>
                          )}
                          <button
                            onClick={() => removeFromCart(product.id, size)}
                            className="text-[11px] font-semibold text-red-700 hover:text-red-900 underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
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
                  <span className="font-medium text-zinc-500">
                    Calculated at checkout
                  </span>
                </div>
                <div className="pt-2 border-t border-zinc-200 flex justify-between text-sm font-semibold text-zinc-900">
                  <span>Total</span>
                  <span>
                    {STORE_CONFIG.defaultPricing.currency}
                    {subtotal.toLocaleString()}
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
                {hasStockIssues ? (
                  <button
                    disabled
                    className="w-full py-2.5 bg-zinc-300 text-zinc-500 text-xs font-semibold rounded-md cursor-not-allowed uppercase tracking-wider flex items-center justify-center gap-1.5"
                    title="Please resolve stock issues before checking out"
                  >
                    Checkout <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <Link
                    href="/checkout"
                    onClick={() => setIsCartOpen(false)}
                    className="w-full py-2.5 bg-zinc-900 text-white text-xs font-semibold rounded-md hover:bg-zinc-800 transition-colors uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    Checkout <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
              {hasStockIssues && (
                <p className="text-[11px] text-center text-red-600 font-medium">
                  Fix stock issues above to proceed to checkout
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, Coupon } from '@/types';
import { validateCouponCode } from '@/lib/data';

interface CartContextType {
  cart: CartItem[];
  /** For Frame products, pass size, variantId, variantStock, and variantPrice
   *  so the cart line is keyed per-size and uses the correct price/stock. */
  addToCart: (
    product: Product,
    quantity?: number,
    size?: string,
    variantId?: string,
    variantStock?: number,
    variantPrice?: number
  ) => void;
  removeFromCart: (productId: string, size?: string) => void;
  updateQuantity: (productId: string, quantity: number, size?: string) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  toastMessage: string | null;

  // Coupon state
  coupon: Coupon | null;
  couponCode: string;
  setCouponCode: (code: string) => void;
  discountAmount: number;
  isFreeShippingCoupon: boolean;
  couponMessage: { type: 'success' | 'error'; text: string } | null;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;

  // Auth User state helper
  user: { id: string; email: string; name: string } | null;
  setUser: (user: { id: string; email: string; name: string } | null) => void;
  cartLoaded: boolean;
}

/** Unique identifier for a cart line — product + optional size. */
const lineKey = (productId: string, size?: string) => `${productId}__${size || ''}`;

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isFreeShippingCoupon, setIsFreeShippingCoupon] = useState(false);
  const [couponMessage, setCouponMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // User state
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);
  const [cartLoaded, setCartLoaded] = useState(false);

  // Load cart and user from localStorage on mount (client-side only to prevent hydration mismatch)
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('sriyam_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error('Failed to load user from storage', e);
    }

    try {
      const saved = localStorage.getItem('sriyam_cart');
      if (saved) {
        setCart(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load cart from storage', e);
    }

    setCartLoaded(true);
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    if (!cartLoaded) return;
    try {
      localStorage.setItem('sriyam_cart', JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart to storage', e);
    }
  }, [cart, cartLoaded]);

  // Save user to localStorage
  useEffect(() => {
    if (!cartLoaded) return;
    if (user) {
      localStorage.setItem('sriyam_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('sriyam_user');
    }
  }, [user, cartLoaded]);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  // product.price already reflects the variant price (set in addToCart)
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // Re-validate coupon whenever cart subtotal changes
  useEffect(() => {
    if (coupon) {
      validateCouponCode(coupon.code, subtotal).then((res) => {
        if (res.success) {
          setDiscountAmount(res.discountAmount);
          setIsFreeShippingCoupon(res.isFreeShipping);
        } else {
          setCoupon(null);
          setDiscountAmount(0);
          setIsFreeShippingCoupon(false);
          setCouponMessage({ type: 'error', text: res.message });
        }
      });
    }
  }, [subtotal]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const addToCart = (
    product: Product,
    quantity: number = 1,
    size?: string,
    variantId?: string,
    variantStock?: number,
    variantPrice?: number
  ) => {
    // For variant items, create an effective product copy with the variant's price/stock
    const effectiveProduct: Product =
      size && variantPrice !== undefined && variantStock !== undefined
        ? { ...product, price: variantPrice, stock: variantStock }
        : product;

    const maxStock = effectiveProduct.stock > 0 ? Math.min(5, effectiveProduct.stock) : 0;
    if (maxStock <= 0) {
      triggerToast(`"${product.name}" (${size || ''}) is currently out of stock.`);
      return;
    }

    const key = lineKey(product.id, size);

    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) => lineKey(item.product.id, item.size) === key
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        const newQty = Math.min(maxStock, updated[existingIdx].quantity + quantity);
        updated[existingIdx] = { ...updated[existingIdx], quantity: newQty };
        return updated;
      }
      const initialQty = Math.min(maxStock, quantity);
      return [...prev, { product: effectiveProduct, quantity: initialQty, size, variantId }];
    });

    const label = size ? `"${product.name}" (${size})` : `"${product.name}"`;
    triggerToast(`Added ${label} to cart`);
  };

  const removeFromCart = (productId: string, size?: string) => {
    const key = lineKey(productId, size);
    setCart((prev) => prev.filter((item) => lineKey(item.product.id, item.size) !== key));
  };

  const updateQuantity = (productId: string, quantity: number, size?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, size);
      return;
    }
    const key = lineKey(productId, size);
    setCart((prev) =>
      prev.map((item) => {
        if (lineKey(item.product.id, item.size) === key) {
          const maxStock = item.product.stock > 0 ? Math.min(5, item.product.stock) : 5;
          return { ...item, quantity: Math.min(maxStock, Math.max(1, quantity)) };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    setCoupon(null);
    setDiscountAmount(0);
    setIsFreeShippingCoupon(false);
    setCouponMessage(null);
    setCouponCode('');
  };

  const applyCoupon = async (code: string): Promise<boolean> => {
    if (!code.trim()) {
      setCouponMessage({ type: 'error', text: 'Please enter a coupon code.' });
      return false;
    }
    const res = await validateCouponCode(code, subtotal);
    if (res.success && res.coupon) {
      setCoupon(res.coupon);
      setDiscountAmount(res.discountAmount);
      setIsFreeShippingCoupon(res.isFreeShipping);
      setCouponMessage({ type: 'success', text: res.message });
      return true;
    } else {
      setCoupon(null);
      setDiscountAmount(0);
      setIsFreeShippingCoupon(false);
      setCouponMessage({ type: 'error', text: res.message });
      return false;
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    setCouponCode('');
    setDiscountAmount(0);
    setIsFreeShippingCoupon(false);
    setCouponMessage(null);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        isCartOpen,
        setIsCartOpen,
        toastMessage,
        coupon,
        couponCode,
        setCouponCode,
        discountAmount,
        isFreeShippingCoupon,
        couponMessage,
        applyCoupon,
        removeCoupon,
        user,
        setUser,
        cartLoaded,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

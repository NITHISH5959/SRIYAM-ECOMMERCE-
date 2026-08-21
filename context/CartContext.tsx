'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, Coupon } from '@/types';
import { validateCouponCode } from '@/lib/data';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
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
}

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
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('sriyam_user');
      if (savedUser) {
        try {
          return JSON.parse(savedUser);
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  });

  // Load cart from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sriyam_cart');
      if (saved) {
        setCart(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load cart from storage', e);
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sriyam_cart', JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart to storage', e);
    }
  }, [cart]);

  // Save user to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('sriyam_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('sriyam_user');
    }
  }, [user]);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
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
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const addToCart = (product: Product, quantity: number = 1) => {
    const maxStock = product.stock > 0 ? Math.min(5, product.stock) : 0;
    if (maxStock <= 0) {
      triggerToast(`"${product.name}" is currently out of stock.`);
      return;
    }

    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.product.id === product.id);
      if (existingIdx > -1) {
        const updated = [...prev];
        const newQty = Math.min(maxStock, updated[existingIdx].quantity + quantity);
        updated[existingIdx].quantity = newQty;
        return updated;
      }
      const initialQty = Math.min(maxStock, quantity);
      return [...prev, { product, quantity: initialQty }];
    });
    triggerToast(`Added "${product.name}" to cart`);
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const maxStock = item.product.stock > 0 ? Math.min(5, item.product.stock) : 5;
          const targetQty = Math.min(maxStock, Math.max(1, quantity));
          return { ...item, quantity: targetQty };
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

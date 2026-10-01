'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { STORE_CONFIG } from '@/lib/config';
import { getAddresses, getProducts, validateCouponCode } from '@/lib/data';
import { INDIAN_STATES, calculateShippingFee, isTamilNadu, validateAddress } from '@/lib/shipping';
import { Address, CartItem } from '@/types';
import {
  ArrowLeft,
  ShoppingBag,
  CreditCard,
  Lock,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Tag,
  X,
  Truck,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

/**
 * Robust loader for Razorpay Checkout SDK.
 * Handles preloading, DOM verification, and dynamic script injection fallback.
 */
function loadRazorpaySDK(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).Razorpay) return resolve(true);

    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      let checks = 0;
      const interval = setInterval(() => {
        checks++;
        if ((window as any).Razorpay) {
          clearInterval(interval);
          resolve(true);
        } else if (checks > 50) {
          clearInterval(interval);
          resolve(false);
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// Payment method logos / badges SVG icons
function PaymentIcons() {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Visa */}
      <span className="inline-flex items-center justify-center px-1.5 py-0.5 bg-white border border-zinc-200 rounded text-[10px] font-black text-blue-800 tracking-tighter">
        VISA
      </span>
      {/* Mastercard */}
      <span className="inline-flex items-center justify-center px-1.5 py-0.5 bg-white border border-zinc-200 rounded text-[10px] font-bold text-red-600 tracking-tight">
        <span className="text-red-500 font-black">MC</span>
      </span>
      {/* RuPay */}
      <span className="inline-flex items-center justify-center px-1.5 py-0.5 bg-white border border-zinc-200 rounded text-[10px] font-bold text-cyan-800">
        RuPay
      </span>
      {/* UPI */}
      <span className="inline-flex items-center justify-center px-1.5 py-0.5 bg-white border border-zinc-200 rounded text-[10px] font-black text-emerald-700">
        UPI
      </span>
      {/* Netbanking */}
      <span className="inline-flex items-center justify-center px-1.5 py-0.5 bg-white border border-zinc-200 rounded text-[9px] font-medium text-zinc-600">
        NetBanking
      </span>
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const {
    cart,
    subtotal,
    coupon,
    discountAmount,
    isFreeShippingCoupon,
    couponMessage,
    applyCoupon,
    removeCoupon,
    clearCart,
    user,
    cartLoaded,
  } = useCart();

  // Form states
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('India');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');

  // Checkboxes
  const [sendDeals, setSendDeals] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Field validation touched states
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Discount code box in right column
  const [discountInput, setDiscountInput] = useState('');
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);

  // Mobile order summary accordion state
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  // Saved addresses for logged-in user
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');

  // Payment execution states
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');
  const [stockError, setStockError] = useState('');
  const [hasStockIssue, setHasStockIssue] = useState(false);
  const [rzpLoaded, setRzpLoaded] = useState(false);
  const [rzpError, setRzpError] = useState(false);
  const [scriptRetryKey, setScriptRetryKey] = useState(0);

  // Proactively check and load Razorpay SDK on mount
  useEffect(() => {
    loadRazorpaySDK().then((ready) => {
      if (ready) {
        setRzpLoaded(true);
        setRzpError(false);
      }
    });
  }, [scriptRetryKey]);

  // Re-validate live database stock on page load and cart change
  useEffect(() => {
    if (cart.length === 0) return;

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
        if (data && !data.valid && Array.isArray(data.errors) && data.errors.length > 0) {
          setHasStockIssue(true);
          const firstErr = data.errors[0];
          setStockError(firstErr.message || 'Some items in your cart are no longer available in the requested quantity.');
        } else {
          setHasStockIssue(false);
          setStockError('');
        }
      })
      .catch((err) => {
        console.error('Failed to validate stock on checkout page load', err);
      });
  }, [cart]);

  // Sync user profile & saved addresses if logged in
  useEffect(() => {
    if (user) {
      if (user.email && !email) setEmail(user.email);
      if (user.name && !fullName) setFullName(user.name);

      getAddresses(user.id).then((addrs) => {
        if (addrs && addrs.length > 0) {
          setSavedAddresses(addrs);
          const defaultAddr = addrs.find((a) => a.is_default) || addrs[0];
          setSelectedAddressId(defaultAddr.id);
          // Prefill fields from default saved address
          setFullName((prev) => prev || defaultAddr.name || '');
          setPhone((prev) => prev || defaultAddr.phone || '');
          setAddressLine1((prev) => prev || defaultAddr.line1 || '');
          setAddressLine2((prev) => prev || defaultAddr.line2 || '');
          setCity((prev) => prev || defaultAddr.city || '');
          setState((prev) => prev || defaultAddr.state || '');
          setPincode((prev) => prev || defaultAddr.pincode || '');
        }
      });
    }
  }, [user]);

  // When user selects a different saved address from dropdown
  const handleSelectSavedAddress = (addressId: string) => {
    setSelectedAddressId(addressId);
    if (!addressId) return;
    const addr = savedAddresses.find((a) => a.id === addressId);
    if (addr) {
      setFullName(addr.name || '');
      setPhone(addr.phone || '');
      setAddressLine1(addr.line1 || '');
      setAddressLine2(addr.line2 || '');
      setCity(addr.city || '');
      setState(addr.state || '');
      setPincode(addr.pincode || '');
      setTouched({});
    }
  };

  // Validation logic
  const emailValid = useMemo(() => {
    const clean = email.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
  }, [email]);

  const phoneValid = useMemo(() => {
    const digits = phone.replace(/\D/g, '');
    return digits.length === 10;
  }, [phone]);

  const nameValid = useMemo(() => {
    return fullName.trim().length >= 2;
  }, [fullName]);

  const addressValid = useMemo(() => {
    return addressLine1.trim().length >= 4;
  }, [addressLine1]);

  const cityValid = useMemo(() => {
    return city.trim().length >= 2;
  }, [city]);

  const stateValid = useMemo(() => {
    return state.trim().length > 0 && INDIAN_STATES.includes(state as any);
  }, [state]);

  const pincodeValid = useMemo(() => {
    const digits = pincode.replace(/\D/g, '');
    return digits.length === 6;
  }, [pincode]);

  const isFormValid =
    emailValid &&
    nameValid &&
    addressValid &&
    cityValid &&
    stateValid &&
    pincodeValid &&
    phoneValid &&
    agreeTerms;

  // State-based shipping calculations
  const hasStateSelected = Boolean(state && stateValid);
  const shippingRate = hasStateSelected ? calculateShippingFee(state, isFreeShippingCoupon) : 0;
  const effectiveShippingFee = isFreeShippingCoupon ? 0 : shippingRate;
  const finalTotal = Math.max(0, subtotal - discountAmount) + (hasStateSelected ? effectiveShippingFee : 0);

  // Discount code submit handler
  const handleApplyDiscountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountInput.trim()) return;
    setIsApplyingDiscount(true);
    await applyCoupon(discountInput.trim());
    setIsApplyingDiscount(false);
  };

  // Payment checkout initiator
  const handleProceedPayment = async () => {
    setPayError('');
    setStockError('');

    // Mark all fields touched to trigger validation alerts if incomplete
    setTouched({
      email: true,
      fullName: true,
      addressLine1: true,
      city: true,
      state: true,
      pincode: true,
      phone: true,
      agreeTerms: true,
    });

    if (!isFormValid) {
      if (!emailValid) setPayError('Please provide a valid email address.');
      else if (!nameValid) setPayError('Please provide your full name.');
      else if (!addressValid) setPayError('Please provide your delivery street address.');
      else if (!cityValid) setPayError('Please provide your city.');
      else if (!stateValid) setPayError('Please select a valid destination state.');
      else if (!pincodeValid) setPayError('Please provide a valid 6-digit postal pincode.');
      else if (!phoneValid) setPayError('Please provide a valid 10-digit mobile number.');
      else if (!agreeTerms) setPayError('Please accept the Terms & Conditions and Privacy Policy.');
      return;
    }

    if (hasStockIssue) {
      setPayError('Please resolve out-of-stock items before paying.');
      return;
    }

    setPayLoading(true);

    try {
      // 1. Ensure Razorpay SDK is loaded
      let isReady = typeof window !== 'undefined' && !!(window as any).Razorpay;
      if (!isReady) {
        isReady = await loadRazorpaySDK();
      }
      if (!isReady) {
        setPayError('Payment gateway could not be loaded. Please check your internet connection and retry.');
        setRzpError(true);
        setPayLoading(false);
        return;
      }
      setRzpLoaded(true);
      setRzpError(false);

      // 2. Format shipping address and items payload
      const cleanPhone = phone.replace(/\D/g, '');
      const cleanEmail = email.trim();
      const shippingAddress: Address = {
        id: selectedAddressId || `addr_${Date.now()}`,
        user_id: user?.id || 'guest',
        name: fullName.trim(),
        phone: cleanPhone,
        email: cleanEmail,
        line1: addressLine1.trim(),
        line2: addressLine2.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.replace(/\D/g, ''),
        is_default: false,
      };

      const cartItems = cart.map((i) => ({
        product_id: i.product.id,
        name: i.product.name,
        quantity: i.quantity,
        image: i.product.images?.[0] || '',
        variant_id: i.variantId,
        size: i.size,
      }));

      // 3. Call server endpoint to strictly pre-validate stock and create authoritative Razorpay order
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems,
          coupon_code: coupon?.code || '',
          shipping_fee: effectiveShippingFee,
          user_id: user?.id || '',
          contact_email: cleanEmail,
          shipping_address: shippingAddress,
        }),
      });

      const orderData = await orderRes.json().catch(() => null);

      if (orderRes.status === 409 || orderData?.code === 'OUT_OF_STOCK') {
        setHasStockIssue(true);
        setStockError(orderData?.message || 'Some items in your cart are no longer available in the requested quantity.');
        setPayError('Stock ran out for one or more items. Please edit your cart before paying.');
        setPayLoading(false);
        return;
      }

      if (!orderData?.success) {
        setPayError(orderData?.message || 'Failed to initialize payment. Please try again.');
        setPayLoading(false);
        return;
      }

      const serverTotal = orderData.calculatedTotal ?? finalTotal;

      // 5. Verification callback after user completes Razorpay modal
      const verifyPayment = async (rpOrderId: string, rpPaymentId: string, rpSig: string) => {
        try {
          setPayLoading(true);
          const vRes = await fetch('/api/razorpay/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: rpOrderId,
              razorpay_payment_id: rpPaymentId,
              razorpay_signature: rpSig,
              orderData: {
                user_id: user?.id || '',
                contact_email: cleanEmail,
                items: cartItems,
                subtotal,
                discount_amount: discountAmount,
                coupon_code: coupon?.code || '',
                shipping_fee: effectiveShippingFee,
                total: serverTotal,
                shipping_address: shippingAddress,
              },
            }),
          });

          const vData = await vRes.json().catch(() => null);

          if (vRes.ok && vData?.success) {
            clearCart();
            const destinationId = vData.orderNumber || vData.orderId;
            router.push(`/order-success/${destinationId}`);
          } else {
            const errorMsg = vData?.message || "Payment didn't go through. Please try again.";
            setPayError(errorMsg);
            setPayLoading(false);
          }
        } catch (vErr: any) {
          console.error('[verify-payment Error]', vErr);
          setPayError('Payment verification failed. Please check your connection or contact customer support.');
          setPayLoading(false);
        }
      };

      // 6. Prefill and open Razorpay modal
      const prefillData: Record<string, string> = {};
      if (fullName.trim()) prefillData.name = fullName.trim();
      if (email.trim() && email.includes('@')) prefillData.email = email.trim();
      if (cleanPhone.length >= 10) prefillData.contact = cleanPhone.slice(-10);

      const options: Record<string, any> = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: STORE_CONFIG.name,
        description: 'Order Payment — Sriyam Store',
        order_id: orderData.id,
        theme: { color: '#18181b' }, // Zinc 900
        modal: {
          ondismiss: function () {
            setPayLoading(false);
            setPayError("Payment was cancelled. You can retry whenever you're ready.");
          },
        },
        handler: function (response: any) {
          try {
            verifyPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );
          } catch (err: any) {
            console.error('[Razorpay Handler Error]', err);
            setPayError("Payment didn't go through. Please try again.");
            setPayLoading(false);
          }
        },
      };

      if (Object.keys(prefillData).length > 0) {
        options.prefill = prefillData;
      }

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        console.warn('[Razorpay Payment Failed Callback]', resp?.error);
        const reason = resp?.error?.description || resp?.error?.reason;
        const msg = reason
          ? `Payment failed: ${reason}. Please try again.`
          : "Payment failed. Please try again.";
        setPayError(msg);
        setPayLoading(false);
      });

      rzp.open();
    } catch (err: any) {
      console.error('[handleProceedPayment Error]', err);
      setPayError(err.message || 'Something went wrong initializing payment. Please try again.');
      setPayLoading(false);
    }
  };

  // Loading state while cart loads
  if (!cartLoaded) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-800" />
        <p className="text-xs text-zinc-500 font-medium">Loading checkout...</p>
      </div>
    );
  }

  // Empty cart fallback
  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 mx-auto">
          <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-serif font-bold text-zinc-900">Your Cart is Empty</h1>
          <p className="text-xs text-zinc-500">Add products to your cart before proceeding to checkout.</p>
        </div>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-zinc-900 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-amber-800 transition-colors shadow-md"
        >
          <span>Browse Store</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Razorpay Checkout Official SDK Script */}
      <Script
        id="razorpay-checkout-sdk"
        key={`rzp-sdk-${scriptRetryKey}`}
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => {
          setRzpLoaded(true);
          setRzpError(false);
        }}
        onError={() => {
          setRzpError(true);
        }}
      />

      {/* Mobile Collapsible Order Summary Banner */}
      <div className="lg:hidden border-b border-zinc-200 bg-zinc-50/80 sticky top-20 z-30">
        <button
          type="button"
          onClick={() => setMobileSummaryOpen((o) => !o)}
          className="w-full px-4 py-3.5 flex items-center justify-between text-xs font-medium text-zinc-800"
        >
          <div className="flex items-center gap-2 text-zinc-900 font-semibold">
            <ShoppingBag className="w-4 h-4 text-amber-800" />
            <span>{mobileSummaryOpen ? 'Hide order summary' : 'Show order summary'}</span>
            {mobileSummaryOpen ? (
              <ChevronUp className="w-4 h-4 text-zinc-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            )}
          </div>
          <span className="text-sm font-bold text-zinc-900">
            {STORE_CONFIG.defaultPricing.currency}
            {finalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </button>

        {mobileSummaryOpen && (
          <div className="px-4 pb-6 pt-2 border-t border-zinc-200 bg-zinc-50 space-y-4 animate-fadeIn">
            {/* Items */}
            <div className="space-y-3 divide-y divide-zinc-200/70 max-h-64 overflow-y-auto pr-1">
              {cart.map(({ product, quantity, size }) => (
                <div key={`${product.id}__${size || ''}`} className="pt-3 first:pt-0 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-14 bg-zinc-100 rounded-lg overflow-hidden border border-zinc-200 flex-shrink-0 flex items-center justify-center">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-zinc-400 font-semibold text-center px-1">
                          {product.name.slice(0, 4)}
                        </span>
                      )}
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-zinc-700 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">
                        {quantity}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900 line-clamp-1">{product.name}</p>
                      {size && (
                        <p className="text-[11px] text-zinc-500">{size}</p>
                      )}
                    </div>
                  </div>
                  <span className="font-bold text-zinc-900">
                    {STORE_CONFIG.defaultPricing.currency}
                    {(product.price * quantity).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>

            {/* Discount Code */}
            <form onSubmit={handleApplyDiscountSubmit} className="space-y-2 pt-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Discount code"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                  className="flex-1 bg-white border border-zinc-300 rounded-lg px-3 py-2 text-xs font-mono uppercase focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!discountInput.trim() || isApplyingDiscount}
                  className="px-4 py-2 bg-zinc-200 text-zinc-800 text-xs font-bold rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isApplyingDiscount ? '...' : 'Apply'}
                </button>
              </div>

              {coupon && (
                <div className="flex items-center justify-between p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs">
                  <div>
                    <span className="font-mono font-bold text-amber-900">{coupon.code}</span>
                    <span className="text-zinc-500 ml-2">
                      ({coupon.type === 'free_shipping' ? 'Free Shipping' : `₹${discountAmount} off`})
                    </span>
                  </div>
                  <button type="button" onClick={removeCoupon} className="text-zinc-400 hover:text-red-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </form>

            {/* Calculations */}
            <div className="space-y-2 pt-2 text-xs text-zinc-600 border-t border-zinc-200">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-zinc-900">
                  {STORE_CONFIG.defaultPricing.currency}
                  {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Discount</span>
                  <span>
                    -{STORE_CONFIG.defaultPricing.currency}
                    {discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="font-medium text-zinc-900">
                  {!hasStateSelected ? (
                    <span className="text-zinc-500 font-normal">Choose shipping destination</span>
                  ) : isFreeShippingCoupon ? (
                    <span className="text-emerald-700 font-bold uppercase">Free</span>
                  ) : (
                    `${STORE_CONFIG.defaultPricing.currency}${shippingRate.toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-zinc-200 text-sm font-bold text-zinc-900">
                <span>Total</span>
                <span className="text-lg">
                  {STORE_CONFIG.defaultPricing.currency}
                  {finalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          {/* =========================================================================
              LEFT COLUMN: Contact, Delivery, Shipping method, Payment, Terms, Button
              ========================================================================= */}
          <div className="lg:col-span-7 space-y-8">
            {/* Return to store link */}
            <div>
              <Link
                href="/shop"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-amber-800 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to store</span>
              </Link>
            </div>

            {/* Error notifications */}
            {payError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-fadeIn">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                  <span>{payError}</span>
                </div>
                {rzpError ? (
                  <button
                    type="button"
                    onClick={() => {
                      setRzpError(false);
                      setPayError('');
                      setScriptRetryKey((k) => k + 1);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-900 text-xs font-bold rounded-lg hover:bg-red-200 transition-colors flex-shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Gateway</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setPayError('');
                      handleProceedPayment();
                    }}
                    disabled={payLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-700 text-white text-xs font-bold rounded-lg hover:bg-red-800 transition-colors flex-shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Try Again</span>
                  </button>
                )}
              </div>
            )}

            {stockError && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs font-medium text-amber-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
                  <span>{stockError}</span>
                </div>
                <Link href="/cart" className="font-bold underline text-amber-900 ml-2 whitespace-nowrap">
                  Edit Cart
                </Link>
              </div>
            )}

            {/* Section: Contact */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-zinc-900 font-sans tracking-tight">Contact</h2>
                {!user ? (
                  <Link href="/login?redirect=/checkout" className="text-xs text-amber-800 font-medium hover:underline">
                    Have an account? Log in
                  </Link>
                ) : (
                  <span className="text-xs text-zinc-500">
                    Logged in as <strong className="text-zinc-800">{user.name}</strong>
                  </span>
                )}
              </div>

              <div>
                <input
                  type="email"
                  id="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                  className={`w-full px-3.5 py-3 border rounded-lg text-xs bg-white focus:outline-none transition-colors ${
                    touched.email && !emailValid
                      ? 'border-red-500 bg-red-50/20 focus:ring-1 focus:ring-red-500'
                      : 'border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900'
                  }`}
                />
                {touched.email && !emailValid && (
                  <p className="text-[11px] text-red-600 mt-1">Please enter a valid email address.</p>
                )}
              </div>
            </div>

            {/* Section: Delivery */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-zinc-900 font-sans tracking-tight">Delivery</h2>
                {savedAddresses.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-500">Saved Address:</span>
                    <select
                      value={selectedAddressId}
                      onChange={(e) => handleSelectSavedAddress(e.target.value)}
                      className="text-xs border border-zinc-300 rounded px-2 py-1 bg-white text-zinc-800 focus:outline-none focus:border-zinc-900"
                    >
                      {savedAddresses.map((addr) => (
                        <option key={addr.id} value={addr.id}>
                          {addr.name} ({addr.city}, {addr.state})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {/* Full name */}
                <div>
                  <input
                    type="text"
                    id="fullName"
                    placeholder="Full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, fullName: true }))}
                    className={`w-full px-3.5 py-3 border rounded-lg text-xs bg-white focus:outline-none transition-colors ${
                      touched.fullName && !nameValid
                        ? 'border-red-500 bg-red-50/20 focus:ring-1 focus:ring-red-500'
                        : 'border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900'
                    }`}
                  />
                  {touched.fullName && !nameValid && (
                    <p className="text-[11px] text-red-600 mt-1">Please enter your full name.</p>
                  )}
                </div>

                {/* Address Line 1 */}
                <div>
                  <input
                    type="text"
                    id="addressLine1"
                    placeholder="Address (House No., Building, Street)"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, addressLine1: true }))}
                    className={`w-full px-3.5 py-3 border rounded-lg text-xs bg-white focus:outline-none transition-colors ${
                      touched.addressLine1 && !addressValid
                        ? 'border-red-500 bg-red-50/20 focus:ring-1 focus:ring-red-500'
                        : 'border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900'
                    }`}
                  />
                  {touched.addressLine1 && !addressValid && (
                    <p className="text-[11px] text-red-600 mt-1">Please enter your street address.</p>
                  )}
                </div>

                {/* Address Line 2 (Optional) */}
                <div>
                  <input
                    type="text"
                    id="addressLine2"
                    placeholder="Apartment, suite, landmark, etc. (optional)"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    className="w-full px-3.5 py-3 border border-zinc-300 rounded-lg text-xs bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none transition-colors"
                  />
                </div>

                {/* City & Pincode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      id="city"
                      placeholder="City"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      onBlur={() => setTouched((prev) => ({ ...prev, city: true }))}
                      className={`w-full px-3.5 py-3 border rounded-lg text-xs bg-white focus:outline-none transition-colors ${
                        touched.city && !cityValid
                          ? 'border-red-500 bg-red-50/20 focus:ring-1 focus:ring-red-500'
                          : 'border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900'
                      }`}
                    />
                    {touched.city && !cityValid && (
                      <p className="text-[11px] text-red-600 mt-1">Please enter your city.</p>
                    )}
                  </div>

                  <div>
                    <input
                      type="text"
                      id="pincode"
                      maxLength={6}
                      placeholder="PIN code (6 digits)"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                      onBlur={() => setTouched((prev) => ({ ...prev, pincode: true }))}
                      className={`w-full px-3.5 py-3 border rounded-lg text-xs font-mono bg-white focus:outline-none transition-colors ${
                        touched.pincode && !pincodeValid
                          ? 'border-red-500 bg-red-50/20 focus:ring-1 focus:ring-red-500'
                          : 'border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900'
                      }`}
                    />
                    {touched.pincode && !pincodeValid && (
                      <p className="text-[11px] text-red-600 mt-1">Enter a valid 6-digit PIN code.</p>
                    )}
                  </div>
                </div>

                {/* Country */}
                <div className="relative">
                  <label htmlFor="country" className="block text-[10px] text-zinc-500 font-medium mb-1 uppercase tracking-wider">
                    Country
                  </label>
                  <select
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3.5 py-3 border border-zinc-300 rounded-lg text-xs bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none appearance-none pr-8 cursor-pointer"
                  >
                    <option value="India">India</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 bottom-3.5 pointer-events-none" />
                </div>

                {/* State */}
                <div className="relative">
                  <label htmlFor="state" className="block text-[10px] text-zinc-500 font-medium mb-1 uppercase tracking-wider">
                    State
                  </label>
                  <select
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, state: true }))}
                    className={`w-full px-3.5 py-3 border rounded-lg text-xs bg-white focus:outline-none appearance-none pr-8 cursor-pointer transition-colors ${
                      touched.state && !stateValid
                        ? 'border-red-500 bg-red-50/20 focus:ring-1 focus:ring-red-500'
                        : 'border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900'
                    }`}
                  >
                    <option value="">Select State / UT</option>
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 bottom-3.5 pointer-events-none" />
                  {touched.state && !stateValid && (
                    <p className="text-[11px] text-red-600 mt-1">Please select your delivery state.</p>
                  )}
                </div>

                {/* Phone number with country code */}
                <div>
                  <label htmlFor="phone" className="block text-[10px] text-zinc-500 font-medium mb-1 uppercase tracking-wider">
                    Phone number
                  </label>
                  <div className="flex border border-zinc-300 rounded-lg overflow-hidden focus-within:border-zinc-900 focus-within:ring-1 focus-within:ring-zinc-900 bg-white">
                    <div className="flex items-center gap-1.5 px-3 bg-zinc-50 border-r border-zinc-200 text-xs font-semibold text-zinc-700 flex-shrink-0 select-none">
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      id="phone"
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                      className="w-full px-3 py-3 text-xs font-mono focus:outline-none bg-transparent"
                    />
                  </div>
                  {touched.phone && !phoneValid && (
                    <p className="text-[11px] text-red-600 mt-1">Please enter a valid 10-digit mobile number.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Section: Shipping method */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-zinc-900 font-sans tracking-tight">Shipping method</h2>

              {!hasStateSelected ? (
                <div className="p-4 bg-zinc-100/70 border border-zinc-200 rounded-xl text-center text-xs text-zinc-500">
                  Enter delivery details to view shipping options
                </div>
              ) : (
                <div className="p-4 bg-zinc-50 border border-zinc-300 rounded-xl flex items-center justify-between text-xs transition-all">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-zinc-900 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-amber-800" />
                      <span>Express Courier Delivery</span>
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Estimated delivery: 2 – 4 business days ({isTamilNadu(state) ? 'Tamil Nadu' : 'National'} dispatch)
                    </p>
                  </div>
                  <div className="text-right">
                    {isFreeShippingCoupon ? (
                      <span className="font-bold text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                        Free
                      </span>
                    ) : (
                      <span className="font-bold text-zinc-900 text-sm">
                        {STORE_CONFIG.defaultPricing.currency}
                        {shippingRate.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Section: Payment */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-zinc-900 font-sans tracking-tight">Payment</h2>

              <div className="border border-zinc-300 rounded-xl overflow-hidden bg-white">
                <div className="p-4 bg-zinc-50/50 flex items-center justify-between border-b border-zinc-200">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      id="razorpay"
                      name="paymentMethod"
                      defaultChecked
                      className="text-zinc-900 focus:ring-zinc-900"
                    />
                    <label htmlFor="razorpay" className="text-xs font-semibold text-zinc-900 cursor-pointer">
                      Razorpay (Cards, UPI, NetBanking, Wallets)
                    </label>
                  </div>
                  <PaymentIcons />
                </div>
                <div className="p-4 bg-white text-xs text-zinc-500 text-center flex flex-col items-center justify-center gap-1.5 py-6">
                  <Lock className="w-5 h-5 text-zinc-400 stroke-[1.5]" />
                  <p className="text-zinc-600 font-medium">
                    After clicking &ldquo;Continue&rdquo;, you will be redirected to Razorpay to complete your purchase securely.
                  </p>
                </div>
              </div>
            </div>

            {/* Marketing & Terms Checkboxes */}
            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs text-zinc-600">
                <input
                  type="checkbox"
                  checked={sendDeals}
                  onChange={(e) => setSendDeals(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
                <span>Send me exclusive deals, product news, and discounts by email.</span>
              </label>

              <div>
                <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs text-zinc-700 font-medium">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                  />
                  <span>
                    I agree to{' '}
                    <Link href="/terms" target="_blank" className="text-amber-800 underline hover:text-amber-900">
                      Terms &amp; Conditions
                    </Link>
                    ,{' '}
                    <Link href="/privacy" target="_blank" className="text-amber-800 underline hover:text-amber-900">
                      Privacy policy
                    </Link>{' '}
                    and Refund policy.
                  </span>
                </label>
                {touched.agreeTerms && !agreeTerms && (
                  <p className="text-[11px] text-red-600 mt-1 pl-6">
                    You must agree to the terms to proceed.
                  </p>
                )}
              </div>
            </div>

            {/* Continue Button & Razorpay terms disclaimer */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleProceedPayment}
                disabled={payLoading || !isFormValid || hasStockIssue}
                className="w-full py-4 bg-zinc-900 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2"
              >
                {payLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Order...</span>
                  </>
                ) : hasStockIssue ? (
                  <span>Resolve Stock Issues to Pay</span>
                ) : (
                  <span>Continue</span>
                )}
              </button>

              <p className="text-[11px] text-zinc-400 text-center leading-relaxed">
                By using the payment initiation service provided by Razorpay, you confirm that you have read and agree with the{' '}
                <Link href="/terms" target="_blank" className="underline hover:text-zinc-600">
                  Terms &amp; Conditions
                </Link>{' '}
                and{' '}
                <Link href="/privacy" target="_blank" className="underline hover:text-zinc-600">
                  Privacy policy
                </Link>
                .
              </p>
            </div>
          </div>

          {/* =========================================================================
              RIGHT COLUMN: Order Summary (Sticky on Desktop)
              ========================================================================= */}
          <div className="hidden lg:block lg:col-span-5">
            <div className="sticky top-28 bg-zinc-50/70 border border-zinc-200/80 rounded-2xl p-6 shadow-sm space-y-6">
              {/* Order Items List */}
              <div className="space-y-4 max-h-72 overflow-y-auto pr-1 divide-y divide-zinc-200/60">
                {cart.map(({ product, quantity, size }) => (
                  <div key={`${product.id}__${size || ''}`} className="pt-3.5 first:pt-0 flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3">
                      {/* Product Thumbnail with quantity badge */}
                      <div className="relative w-16 h-18 bg-white rounded-lg border border-zinc-200/80 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-xs">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-zinc-400 font-semibold px-1 text-center">
                            {product.name.slice(0, 4)}
                          </span>
                        )}
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-zinc-700 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">
                          {quantity}
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        <p className="font-semibold text-zinc-900 line-clamp-1 max-w-[180px]">
                          {product.name}
                        </p>
                        {size && (
                          <p className="text-[11px] text-zinc-500 font-medium">
                            {size}
                          </p>
                        )}
                      </div>
                    </div>

                    <span className="font-bold text-zinc-900 flex-shrink-0">
                      {STORE_CONFIG.defaultPricing.currency}
                      {(product.price * quantity).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>

              {/* Discount Code Input Box */}
              <form onSubmit={handleApplyDiscountSubmit} className="space-y-2 pt-2 border-t border-zinc-200/60">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter discount code"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                    className="flex-1 bg-white border border-zinc-300 rounded-lg px-3.5 py-2.5 text-xs font-mono font-bold uppercase focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!discountInput.trim() || isApplyingDiscount}
                    className="px-5 py-2.5 bg-zinc-200 text-zinc-800 text-xs font-bold rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isApplyingDiscount ? '...' : 'Apply'}
                  </button>
                </div>

                {coupon && (
                  <div className="flex items-center justify-between p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-xs">
                    <div>
                      <span className="font-mono font-bold text-amber-900">{coupon.code}</span>
                      <span className="text-zinc-500 ml-2">
                        ({coupon.type === 'free_shipping' ? 'Free Shipping Applied' : `₹${discountAmount} Discount Applied`})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="p-1 text-zinc-400 hover:text-red-600 rounded-full transition-colors"
                      title="Remove coupon"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {couponMessage && !coupon && (
                  <div className="p-2.5 bg-red-50 text-red-800 border border-red-200 rounded-lg text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-red-600" />
                    <span>{couponMessage.text}</span>
                  </div>
                )}
              </form>

              {/* Price Calculations */}
              <div className="space-y-2.5 pt-3 border-t border-zinc-200/60 text-xs text-zinc-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-zinc-900">
                    {STORE_CONFIG.defaultPricing.currency}
                    {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Discount</span>
                    <span>
                      -{STORE_CONFIG.defaultPricing.currency}
                      {discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="font-medium text-zinc-900">
                    {!hasStateSelected ? (
                      <span className="text-zinc-500 font-normal">Choose shipping destination</span>
                    ) : isFreeShippingCoupon ? (
                      <span className="text-emerald-700 font-bold uppercase">Free</span>
                    ) : (
                      `${STORE_CONFIG.defaultPricing.currency}${shippingRate.toFixed(2)}`
                    )}
                  </span>
                </div>

                <div className="pt-3 border-t border-zinc-300 flex justify-between items-baseline text-sm font-extrabold text-zinc-900">
                  <span>Total</span>
                  <span className="text-xl text-zinc-900">
                    {STORE_CONFIG.defaultPricing.currency}
                    {finalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

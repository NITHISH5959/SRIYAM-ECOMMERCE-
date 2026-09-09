'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { useCart } from '@/context/CartContext';
import { STORE_CONFIG } from '@/lib/config';
import { getAddresses, saveAddress } from '@/lib/data';
import { INDIAN_STATES, calculateShippingFee, validateAddress, isTamilNadu } from '@/lib/shipping';
import { Address } from '@/types';
import {
  MapPin, Truck, CreditCard, CheckCircle2, Plus, ArrowRight,
  Lock, AlertTriangle, Loader2, RefreshCw, X, Check,
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

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, subtotal, coupon, discountAmount, isFreeShippingCoupon, clearCart, user, cartLoaded } = useCart();

  useEffect(() => {
    if (cartLoaded && !user) {
      router.push('/login?redirect=/checkout');
    }
  }, [user, cartLoaded, router]);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newAddr, setNewAddr] = useState<Partial<Address>>({
    name: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: 'Tamil Nadu',
    pincode: '',
    is_default: true,
  });
  const [addrErrors, setAddrErrors] = useState<Record<string, string>>({});
  const [savingAddr, setSavingAddr] = useState(false);

  // Razorpay SDK loading state & retry key
  const [rzpLoaded, setRzpLoaded] = useState(false);
  const [rzpError, setRzpError] = useState(false);
  const [scriptRetryKey, setScriptRetryKey] = useState(0);

  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');
  const [stockError, setStockError] = useState('');

  // Proactively initialize and check Razorpay SDK on mount
  useEffect(() => {
    loadRazorpaySDK().then((ready) => {
      if (ready) {
        setRzpLoaded(true);
        setRzpError(false);
      }
    });
  }, [scriptRetryKey]);

  // Selected address and active destination state for shipping
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
  const activeState = isAddingNew ? newAddr.state : selectedAddress?.state;

  // Instant state-based shipping calculation (₹150 for Tamil Nadu, ₹200 for other states, ₹0 for free shipping coupon)
  const shippingRate = calculateShippingFee(activeState, isFreeShippingCoupon);
  const effectiveShippingFee = isFreeShippingCoupon ? 0 : shippingRate;
  const finalTotal = Math.max(0, subtotal - discountAmount) + effectiveShippingFee;

  // Sync recipient name once user has hydrated
  useEffect(() => {
    if (user?.name) {
      setNewAddr((prev) => ({ ...prev, name: prev.name || user.name }));
    }
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    getAddresses(user.id).then((addrs) => {
      setAddresses(addrs);
      if (addrs.length > 0) {
        const def = addrs.find((a) => a.is_default) || addrs[0];
        setSelectedAddressId(def.id);
      } else {
        setIsAddingNew(true);
      }
    });
  }, [user]);

  const handleAddrChange = (field: string, value: any) => {
    setNewAddr((prev) => ({ ...prev, [field]: value }));
    if (addrErrors[field]) {
      setAddrErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const handleSaveAddr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const validation = validateAddress(newAddr);
    if (!validation.valid) {
      setAddrErrors(validation.errors);
      return;
    }

    setAddrErrors({});
    setSavingAddr(true);
    try {
      const saved = await saveAddress({ ...newAddr, user_id: user.id });
      setAddresses((prev) => [...prev, saved]);
      setSelectedAddressId(saved.id);
      setIsAddingNew(false);
      setNewAddr({
        name: user.name || '',
        phone: '',
        line1: '',
        line2: '',
        city: '',
        state: 'Tamil Nadu',
        pincode: '',
        is_default: false,
      });
    } catch (err: any) {
      setPayError(err.message || 'Failed to save delivery address.');
    } finally {
      setSavingAddr(false);
    }
  };

  const handlePay = async () => {
    setPayError('');
    setStockError('');
    if (!selectedAddress) {
      setPayError('Please select or add a delivery address.');
      return;
    }

    // Validate delivery address fields
    const addrVal = validateAddress(selectedAddress);
    if (!addrVal.valid) {
      const firstErr = Object.values(addrVal.errors)[0];
      setPayError(`Delivery address error: ${firstErr}`);
      return;
    }

    setPayLoading(true);

    try {
      // 1. Ensure Razorpay SDK is fully ready
      let isReady = typeof window !== 'undefined' && !!(window as any).Razorpay;
      if (!isReady) {
        isReady = await loadRazorpaySDK();
      }
      if (!isReady) {
        setPayError('Payment gateway is loading. Please check your internet connection and click Try Again.');
        setRzpError(true);
        setPayLoading(false);
        return;
      }
      setRzpLoaded(true);
      setRzpError(false);

      // 2. Pre-flight client-side stock check
      for (const item of cart) {
        if (item.product.stock < item.quantity) {
          const sizeLabel = item.size ? ` (${item.size})` : '';
          setStockError(`"${item.product.name}${sizeLabel}" only has ${item.product.stock} unit(s) in stock. Please update your cart.`);
          setPayLoading(false);
          return;
        }
      }

      // 3. Build cart item payload
      const cartItems = cart.map((i) => ({
        product_id: i.product.id,
        name: i.product.name,
        quantity: i.quantity,
        image: i.product.images?.[0] || '',
        variant_id: i.variantId,
        size: i.size,
      }));

      // 4. Create Razorpay order server-side
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems,
          coupon_code: coupon?.code || '',
          shipping_fee: effectiveShippingFee,
          user_id: user?.id || '',
          shipping_address: selectedAddress,
        }),
      });

      const orderData = await orderRes.json().catch(() => null);

      if (!orderData?.success) {
        setPayError(orderData?.message || 'Failed to initialize order payment. Please try again.');
        setPayLoading(false);
        return;
      }

      const serverTotal = orderData.calculatedTotal ?? finalTotal;

      // 5. Verification callback
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
                items: cartItems,
                subtotal,
                discount_amount: discountAmount,
                coupon_code: coupon?.code || '',
                shipping_fee: effectiveShippingFee,
                total: serverTotal,
                shipping_address: selectedAddress,
              },
            }),
          });

          const vData = await vRes.json().catch(() => null);

          if (vRes.ok && vData?.success) {
            clearCart();
            router.push(`/order-success/${vData.orderId}`);
          } else {
            const errorMsg = vData?.message || "Payment didn't go through. Please try again.";
            setPayError(errorMsg);
            setPayLoading(false);
          }
        } catch (vErr: any) {
          console.error('[verify-payment Client Error]', vErr);
          setPayError('Payment verification could not be completed. Please check your connection or contact support.');
          setPayLoading(false);
        }
      };

      // 6. Build clean, sanitized options for Razorpay Checkout
      const prefillData: Record<string, string> = {};
      const customerName = (selectedAddress.name || user?.name || '').trim();
      if (customerName) {
        prefillData.name = customerName;
      }
      const customerEmail = (user?.email || '').trim();
      if (customerEmail && customerEmail.includes('@')) {
        prefillData.email = customerEmail;
      }
      const digitsOnlyPhone = (selectedAddress.phone || '').replace(/\D/g, '');
      if (digitsOnlyPhone.length >= 10) {
        prefillData.contact = digitsOnlyPhone.slice(-10);
      }

      const options: Record<string, any> = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: STORE_CONFIG.name,
        description: 'Order Payment — Sriyam Store',
        order_id: orderData.id,
        theme: { color: '#92400e' },
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
          ? `Payment didn't go through: ${reason}. Please try again.`
          : "Payment didn't go through. Please try again.";
        setPayError(msg);
        setPayLoading(false);
      });

      rzp.open();
    } catch (err: any) {
      console.error('[handlePay error]', err);
      setPayError(err.message || 'Something went wrong initializing payment. Please try again.');
      setPayLoading(false);
    }
  };

  if (cartLoaded && cart.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="text-2xl font-serif font-bold text-zinc-900">Your Cart is Empty</h1>
        <p className="text-xs text-zinc-500">Add products to your cart before proceeding to checkout.</p>
        <Link href="/shop" className="inline-block px-6 py-3 bg-amber-800 text-white font-bold text-xs uppercase rounded-xl">
          Return to Shop
        </Link>
      </div>
    );
  }

  const isPayDisabled = payLoading || !selectedAddress;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Razorpay Checkout Official SDK script */}
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

      <div>
        <p className="text-xs text-zinc-500 mb-1">Checkout</p>
        <h1 className="text-3xl font-serif font-bold text-zinc-900">Complete Your Order</h1>
      </div>

      {payError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
            <span>{payError}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {rzpError ? (
              <button
                type="button"
                onClick={() => {
                  setRzpError(false);
                  setPayError('');
                  setScriptRetryKey((k) => k + 1);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-900 text-xs font-bold rounded-lg hover:bg-red-200 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Gateway</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPayError('');
                  handlePay();
                }}
                disabled={isPayDisabled}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-800 text-white text-xs font-bold rounded-lg hover:bg-amber-900 disabled:opacity-50 transition-colors uppercase tracking-wider"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            )}
          </div>
        </div>
      )}

      {stockError && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <span>{stockError}</span>
          </div>
          <Link href="/cart" className="font-bold underline text-amber-900 ml-2 whitespace-nowrap">
            Edit Cart
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Address + Shipping */}
        <div className="lg:col-span-7 space-y-6">
          {/* Address Selection */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <h3 className="font-serif font-bold text-lg text-zinc-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-800" />
                1. Delivery Address
              </h3>
              {!isAddingNew && (
                <button
                  type="button"
                  onClick={() => setIsAddingNew(true)}
                  className="text-xs font-bold text-amber-800 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />Add New
                </button>
              )}
            </div>

            {/* Address List */}
            {!isAddingNew && addresses.map((addr) => {
              const isSelected = selectedAddressId === addr.id;
              const isTN = isTamilNadu(addr.state);
              return (
                <label
                  key={addr.id}
                  className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-amber-700 bg-amber-50/40 ring-1 ring-amber-700'
                      : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    checked={isSelected}
                    onChange={() => setSelectedAddressId(addr.id)}
                    className="mt-0.5 text-amber-800 focus:ring-amber-700"
                  />
                  <div className="text-xs space-y-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-zinc-900">
                        {addr.name} <span className="font-normal text-zinc-500">({addr.phone})</span>
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isTN ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {isTN ? 'Tamil Nadu (₹150 ship)' : `${addr.state || 'Other State'} (₹200 ship)`}
                      </span>
                    </div>
                    <p className="text-zinc-600">
                      {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}, {addr.city}, {addr.state} – <span className="font-mono font-bold text-amber-900">{addr.pincode}</span>
                    </p>
                  </div>
                </label>
              );
            })}

            {/* Add New Address Form */}
            {isAddingNew && (
              <form onSubmit={handleSaveAddr} noValidate className="space-y-3 pt-2 bg-amber-50/30 p-4 rounded-xl border border-amber-200/80">
                <p className="text-xs font-bold text-zinc-900">Enter Delivery Address</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Full Name */}
                  <div className="space-y-1">
                    <input
                      type="text"
                      placeholder="Full Name *"
                      value={newAddr.name || ''}
                      onChange={(e) => handleAddrChange('name', e.target.value)}
                      className={`w-full border rounded-lg p-2.5 text-xs focus:ring-2 focus:outline-none bg-white ${
                        addrErrors.name ? 'border-red-500 bg-red-50/40 focus:ring-red-500' : 'border-zinc-300 focus:ring-amber-700'
                      }`}
                    />
                    {addrErrors.name && <p className="text-[11px] text-red-600 font-medium">{addrErrors.name}</p>}
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="Phone Number (10 digits) *"
                      value={newAddr.phone || ''}
                      onChange={(e) => handleAddrChange('phone', e.target.value.replace(/\D/g, ''))}
                      className={`w-full border rounded-lg p-2.5 text-xs font-mono focus:ring-2 focus:outline-none bg-white ${
                        addrErrors.phone ? 'border-red-500 bg-red-50/40 focus:ring-red-500' : 'border-zinc-300 focus:ring-amber-700'
                      }`}
                    />
                    {addrErrors.phone && <p className="text-[11px] text-red-600 font-medium">{addrErrors.phone}</p>}
                  </div>
                </div>

                {/* Address Line 1 */}
                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder="Address Line 1 (House No., Building, Street) *"
                    value={newAddr.line1 || ''}
                    onChange={(e) => handleAddrChange('line1', e.target.value)}
                    className={`w-full border rounded-lg p-2.5 text-xs focus:ring-2 focus:outline-none bg-white ${
                      addrErrors.line1 ? 'border-red-500 bg-red-50/40 focus:ring-red-500' : 'border-zinc-300 focus:ring-amber-700'
                    }`}
                  />
                  {addrErrors.line1 && <p className="text-[11px] text-red-600 font-medium">{addrErrors.line1}</p>}
                </div>

                {/* Address Line 2 */}
                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder="Address Line 2 (Landmark, Suite, etc. - Optional)"
                    value={newAddr.line2 || ''}
                    onChange={(e) => handleAddrChange('line2', e.target.value)}
                    className="w-full border border-zinc-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-amber-700 focus:outline-none bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* City */}
                  <div className="space-y-1">
                    <input
                      type="text"
                      placeholder="City *"
                      value={newAddr.city || ''}
                      onChange={(e) => handleAddrChange('city', e.target.value)}
                      className={`w-full border rounded-lg p-2.5 text-xs focus:ring-2 focus:outline-none bg-white ${
                        addrErrors.city ? 'border-red-500 bg-red-50/40 focus:ring-red-500' : 'border-zinc-300 focus:ring-amber-700'
                      }`}
                    />
                    {addrErrors.city && <p className="text-[11px] text-red-600 font-medium">{addrErrors.city}</p>}
                  </div>

                  {/* State */}
                  <div className="space-y-1">
                    <select
                      value={newAddr.state || 'Tamil Nadu'}
                      onChange={(e) => handleAddrChange('state', e.target.value)}
                      className={`w-full border rounded-lg p-2.5 text-xs focus:ring-2 focus:outline-none bg-white ${
                        addrErrors.state ? 'border-red-500 bg-red-50/40 focus:ring-red-500' : 'border-zinc-300 focus:ring-amber-700'
                      }`}
                    >
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {addrErrors.state && <p className="text-[11px] text-red-600 font-medium">{addrErrors.state}</p>}
                  </div>

                  {/* Pincode */}
                  <div className="space-y-1">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Pincode (6 digits) *"
                      value={newAddr.pincode || ''}
                      onChange={(e) => handleAddrChange('pincode', e.target.value.replace(/\D/g, ''))}
                      className={`w-full border rounded-lg p-2.5 text-xs font-mono focus:ring-2 focus:outline-none bg-white ${
                        addrErrors.pincode ? 'border-red-500 bg-red-50/40 focus:ring-red-500' : 'border-zinc-300 focus:ring-amber-700'
                      }`}
                    />
                    {addrErrors.pincode && <p className="text-[11px] text-red-600 font-medium">{addrErrors.pincode}</p>}
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  {addresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNew(false);
                        setAddrErrors({});
                      }}
                      className="px-4 py-2 border border-zinc-300 text-xs font-semibold rounded-lg hover:bg-zinc-100 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={savingAddr}
                    className="px-5 py-2 bg-amber-800 text-white font-bold text-xs uppercase rounded-lg hover:bg-amber-900 transition-colors disabled:opacity-50"
                  >
                    {savingAddr ? 'Saving...' : 'Save & Select'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Shipping Details */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-800" />
                <h3 className="font-serif font-bold text-lg text-zinc-900">2. Shipping Details</h3>
              </div>
              <span className="text-[11px] font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                Origin: Dharmapuri, Tamil Nadu
              </span>
            </div>

            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-zinc-900">Express Courier Delivery</p>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                    {isTamilNadu(activeState) ? 'Tamil Nadu Rate' : 'National Rate'}
                  </span>
                </div>
                <p className="text-zinc-500">
                  Delivering to: <span className="font-semibold text-zinc-800">{activeState || 'Tamil Nadu'}</span>
                </p>
                <p className="text-amber-800 font-medium text-[11px]">
                  Estimated delivery: 2 – 4 business days
                </p>
              </div>

              <div className="text-right">
                {isFreeShippingCoupon ? (
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded uppercase border border-emerald-200">
                      Free
                    </span>
                    <p className="text-[10px] text-zinc-400 line-through">₹{shippingRate}</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <span className="text-base font-extrabold text-zinc-900">
                      {STORE_CONFIG.defaultPricing.currency}{shippingRate}
                    </span>
                    <p className="text-[10px] text-zinc-400">
                      {isTamilNadu(activeState) ? '₹150 (TN)' : '₹200 (Other states)'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-500 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
              <span>Standard delivery fee: <strong>₹150 for Tamil Nadu</strong> · <strong>₹200 for all other states</strong></span>
            </div>
          </div>
        </div>

        {/* Right: Summary + Pay */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-5 sticky top-24">
            <h3 className="font-serif font-bold text-lg text-zinc-900 border-b border-zinc-100 pb-4">Order Summary</h3>
            <div className="max-h-52 overflow-y-auto space-y-3 pr-1">
              {cart.map(({ product, quantity, size }) => (
                <div key={`${product.id}__${size || ''}`} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-11 bg-amber-50 rounded border flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-amber-900 overflow-hidden">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        product.name.slice(0, 4)
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900 line-clamp-1 max-w-[140px]">{product.name}</p>
                      {size && <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Size: {size}</p>}
                      <p className="text-zinc-400">×{quantity}</p>
                    </div>
                  </div>
                  <span className="font-bold text-zinc-900">{STORE_CONFIG.defaultPricing.currency}{(product.price * quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2.5 pt-3 border-t border-zinc-100 text-xs">
              <div className="flex justify-between text-zinc-500">
                <span>Subtotal</span>
                <span className="font-medium text-zinc-900">{STORE_CONFIG.defaultPricing.currency}{subtotal.toLocaleString()}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount ({coupon?.code})</span>
                  <span>-{STORE_CONFIG.defaultPricing.currency}{discountAmount}</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-500">
                <span>Shipping ({activeState || 'Tamil Nadu'})</span>
                <span className="font-medium text-zinc-900">
                  {isFreeShippingCoupon ? (
                    <span className="text-emerald-600 font-bold">Free</span>
                  ) : (
                    `${STORE_CONFIG.defaultPricing.currency}${shippingRate}`
                  )}
                </span>
              </div>
              <div className="pt-2.5 border-t border-zinc-200 flex justify-between font-extrabold text-zinc-900 text-sm">
                <span>Total</span>
                <span className="text-xl text-amber-900">
                  {STORE_CONFIG.defaultPricing.currency}{finalTotal.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={handlePay}
              disabled={isPayDisabled}
              className="w-full py-4 bg-amber-800 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-amber-900 disabled:opacity-50 transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              {payLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Payment...</span>
                </>
              ) : !selectedAddress ? (
                <span>Select Delivery Address</span>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Pay {STORE_CONFIG.defaultPricing.currency}{finalTotal.toLocaleString()} via Razorpay</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-zinc-400 text-center">UPI · Cards · Netbanking · Wallets · EMI</p>
          </div>
        </div>
      </div>
    </div>
  );
}

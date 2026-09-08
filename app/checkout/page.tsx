'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { STORE_CONFIG } from '@/lib/config';
import { getAddresses, saveAddress } from '@/lib/data';
import { Address } from '@/types';
import {
  MapPin, Truck, CreditCard, CheckCircle2, Plus, ArrowRight,
  Lock, AlertTriangle, Loader2, RefreshCw,
} from 'lucide-react';

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
  const [newAddr, setNewAddr] = useState<Partial<Address>>({ name: '', phone: '', line1: '', city: '', state: '', pincode: '', is_default: true });
  const [savingAddr, setSavingAddr] = useState(false);

  const shippingFee = (subtotal >= STORE_CONFIG.freeShippingThreshold || isFreeShippingCoupon) ? 0 : STORE_CONFIG.defaultShippingFee;

  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');
  const [stockError, setStockError] = useState('');

  const finalTotal = Math.max(0, subtotal - discountAmount) + shippingFee;
  const selectedAddress = addresses.find(a => a.id === selectedAddressId);

  // Sync recipient name once user has hydrated
  useEffect(() => {
    if (user?.name) {
      setNewAddr(prev => ({ ...prev, name: prev.name || user.name }));
    }
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    getAddresses(user.id).then(addrs => {
      setAddresses(addrs);
      if (addrs.length > 0) {
        const def = addrs.find(a => a.is_default) || addrs[0];
        setSelectedAddressId(def.id);
      } else {
        setIsAddingNew(true);
      }
    });
  }, [user]);

  const handleSaveAddr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingAddr(true);
    try {
      const saved = await saveAddress({ ...newAddr, user_id: user.id });
      setAddresses(prev => [...prev, saved]);
      setSelectedAddressId(saved.id);
      setIsAddingNew(false);
    } finally { setSavingAddr(false); }
  };

  const handlePay = async () => {
    setPayError(''); setStockError('');
    if (!selectedAddress) { setPayError('Please select or add a delivery address.'); return; }
    setPayLoading(true);
    try {
      // Pre-flight client-side stock check (UX convenience only — server re-checks)
      for (const item of cart) {
        if (item.product.stock < item.quantity) {
          const label = item.size ? `"${item.product.name}" (${item.size})` : `"${item.product.name}"`;
          setStockError(`${label} only has ${item.product.stock} unit(s) left. Please update your cart.`);
          setPayLoading(false);
          return;
        }
      }

      // Build cart items — IDs and quantities only; server fetches live prices
      const cartItems = cart.map(i => ({
        product_id: i.product.id,
        name: i.product.name,
        quantity: i.quantity,
        image: i.product.images?.[0] || '',
        variant_id: i.variantId,
        size: i.size,
      }));

      // Step 1: Create Razorpay order — server recalculates total from live DB prices
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems,
          coupon_code: coupon?.code || '',
          shipping_fee: shippingFee,
          user_id: user?.id || '',
          shipping_address: selectedAddress,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) {
        setPayError('Failed to create payment: ' + orderData.message);
        setPayLoading(false);
        return;
      }

      // Use server-authorised total (not client-calculated finalTotal)
      const serverTotal = orderData.calculatedTotal ?? finalTotal;

      // Step 2: After payment completes, verify signature server-side and create order
      const verifyPayment = async (rpOrderId: string, rpPaymentId: string, rpSig: string) => {
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
              shipping_fee: shippingFee,
              total: serverTotal,
              shipping_address: selectedAddress,
            },
          }),
        });
        const vData = await vRes.json();
        if (vData.success) {
          clearCart();
          router.push(`/order-success/${vData.orderId}`);
        } else {
          setPayError(vData.message || 'Payment verification failed. Please contact support.');
          setPayLoading(false);
        }
      };

      // Open Razorpay Checkout modal
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: STORE_CONFIG.name,
        description: 'Payment for Sriyam Store Order',
        image: '/logo.png',
        order_id: orderData.id,
        prefill: {
          name: selectedAddress.name || user?.name,
          email: user?.email,
          contact: selectedAddress.phone,
        },
        theme: { color: '#92400e' },
        handler: function (response: any) {
          verifyPayment(
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature
          );
        },
        modal: {
          ondismiss: function () {
            setPayLoading(false);
          },
        },
      };

      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (resp: any) {
          setPayError(resp.error?.description || 'Payment failed. Please try again.');
          setPayLoading(false);
        });
        rzp.open();
      } else {
        setPayError('Razorpay SDK failed to load. Please check your connection.');
        setPayLoading(false);
      }
    } catch (e: any) {
      setPayError(e.message || 'An error occurred while setting up payment.');
      setPayLoading(false);
    }
  };

  if (!cartLoaded) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-amber-800" />
        <span>Loading checkout...</span>
      </div>
    );
  }

  if (cart.length === 0) {
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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div>
        <p className="text-xs text-zinc-500 mb-1">Checkout</p>
        <h1 className="text-3xl font-serif font-bold text-zinc-900">Complete Your Order</h1>
      </div>

      {payError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{payError}</span>
        </div>
      )}

      {stockError && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <span>{stockError}</span>
          </div>
          <Link href="/cart" className="font-bold underline text-amber-900 ml-2 whitespace-nowrap">Edit Cart</Link>
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
                <button onClick={() => setIsAddingNew(true)} className="text-xs font-bold text-amber-800 hover:underline flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" />Add New
                </button>
              )}
            </div>

            {/* Address List */}
            {!isAddingNew && addresses.map(addr => (
              <label key={addr.id} className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${selectedAddressId === addr.id ? 'border-amber-700 bg-amber-50/40 ring-1 ring-amber-700' : 'border-zinc-200 hover:border-zinc-300'}`}>
                <input type="radio" name="address" checked={selectedAddressId === addr.id}
                  onChange={() => setSelectedAddressId(addr.id)}
                  className="mt-0.5 text-amber-800 focus:ring-amber-700" />
                <div className="text-xs space-y-0.5 flex-1">
                  <p className="font-bold text-zinc-900">{addr.name} <span className="font-normal text-zinc-500">({addr.phone})</span></p>
                  <p className="text-zinc-600">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}, {addr.city}, {addr.state} – <span className="font-mono font-bold">{addr.pincode}</span></p>
                </div>
              </label>
            ))}

            {/* Add New Address Form */}
            {isAddingNew && (
              <form onSubmit={handleSaveAddr} className="space-y-3 pt-2">
                <p className="text-xs font-bold text-zinc-800">Enter Delivery Address</p>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" required placeholder="Full Name *" value={newAddr.name || ''} onChange={e => setNewAddr({ ...newAddr, name: e.target.value })} className="border border-zinc-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-amber-700 focus:outline-none" />
                  <input type="tel" required placeholder="Phone Number *" value={newAddr.phone || ''} onChange={e => setNewAddr({ ...newAddr, phone: e.target.value })} className="border border-zinc-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-amber-700 focus:outline-none" />
                </div>
                <input type="text" required placeholder="Address Line 1 *" value={newAddr.line1 || ''} onChange={e => setNewAddr({ ...newAddr, line1: e.target.value })} className="w-full border border-zinc-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-amber-700 focus:outline-none" />
                <div className="grid grid-cols-3 gap-3">
                  <input type="text" required placeholder="City *" value={newAddr.city || ''} onChange={e => setNewAddr({ ...newAddr, city: e.target.value })} className="border border-zinc-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-amber-700 focus:outline-none" />
                  <input type="text" required placeholder="State *" value={newAddr.state || ''} onChange={e => setNewAddr({ ...newAddr, state: e.target.value })} className="border border-zinc-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-amber-700 focus:outline-none" />
                  <input type="text" required pattern="\d{6}" maxLength={6} placeholder="Pincode *" value={newAddr.pincode || ''} onChange={e => setNewAddr({ ...newAddr, pincode: e.target.value })} className="border border-zinc-300 rounded-lg p-2.5 text-xs font-mono focus:ring-2 focus:ring-amber-700 focus:outline-none" />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  {addresses.length > 0 && <button type="button" onClick={() => setIsAddingNew(false)} className="px-4 py-2 border text-xs font-semibold rounded-lg">Cancel</button>}
                  <button type="submit" disabled={savingAddr} className="px-5 py-2 bg-amber-800 text-white font-bold text-xs uppercase rounded-lg">
                    {savingAddr ? 'Saving...' : 'Save & Select'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Shipping */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 mb-4">
              <Truck className="w-5 h-5 text-amber-800" />
              <h3 className="font-serif font-bold text-lg text-zinc-900">2. Shipping Details</h3>
            </div>
            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between text-xs">
              <div className="space-y-1">
                <p className="font-bold text-zinc-900">Express Courier Delivery</p>
                <p className="text-zinc-500">Flat rate delivery to any location in India</p>
                <p className="text-amber-800 font-medium text-[11px]">Est. delivery: 2 – 4 business days</p>
              </div>
              <div className="text-right">
                {shippingFee === 0 ? (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded uppercase">Free</span>
                ) : (
                  <span className="text-base font-extrabold text-zinc-900">{STORE_CONFIG.defaultPricing.currency}{shippingFee}</span>
                )}
              </div>
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
                    <div className="w-9 h-11 bg-amber-50 rounded border flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-amber-900">
                      {product.images?.[0] ? <img src={product.images[0]} alt="" className="w-full h-full object-cover" /> : product.name.slice(0, 4)}
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
              <div className="flex justify-between text-zinc-500"><span>Subtotal</span><span className="font-medium text-zinc-900">{STORE_CONFIG.defaultPricing.currency}{subtotal.toLocaleString()}</span></div>
              {discountAmount > 0 && <div className="flex justify-between text-emerald-700 font-semibold"><span>Discount ({coupon?.code})</span><span>-{STORE_CONFIG.defaultPricing.currency}{discountAmount}</span></div>}
              <div className="flex justify-between text-zinc-500">
                <span>Shipping</span>
                <span className="font-medium text-zinc-900">{shippingFee === 0 ? <span className="text-emerald-600 font-bold">Free</span> : `${STORE_CONFIG.defaultPricing.currency}${shippingFee}`}</span>
              </div>
              <div className="pt-2.5 border-t border-zinc-200 flex justify-between font-extrabold text-zinc-900 text-sm">
                <span>Total</span>
                <span className="text-xl text-amber-900">{STORE_CONFIG.defaultPricing.currency}{finalTotal.toLocaleString()}</span>
              </div>
            </div>

            <button onClick={handlePay} disabled={payLoading || !selectedAddress}
              className="w-full py-4 bg-amber-800 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-amber-900 disabled:opacity-50 transition-colors shadow-lg flex items-center justify-center gap-2">
              {payLoading ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Processing...</span></> : <><CreditCard className="w-4 h-4" /><span>Pay {STORE_CONFIG.defaultPricing.currency}{finalTotal.toLocaleString()} via Razorpay</span></>}
            </button>
            <p className="text-[11px] text-zinc-400 text-center">UPI · Cards · Netbanking · Wallets · EMI</p>
          </div>
        </div>
      </div>
    </div>
  );
}

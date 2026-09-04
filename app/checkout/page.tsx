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

  const [shippingFee, setShippingFee] = useState(subtotal >= STORE_CONFIG.freeShippingThreshold || isFreeShippingCoupon ? 0 : STORE_CONFIG.defaultShippingFee);
  const [courierName, setCourierName] = useState('Shiprocket Express');
  const [estDays, setEstDays] = useState(3);
  const [calcShipping, setCalcShipping] = useState(false);

  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');
  const [stockError, setStockError] = useState('');

  const totalWeight = cart.reduce((s, i) => s + (i.product.weight_grams || 300) * i.quantity, 0);
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
        calcShippingFee(def.pincode);
      } else {
        setIsAddingNew(true);
      }
    });
  }, [user]);

  const calcShippingFee = async (pincode: string) => {
    if (subtotal >= STORE_CONFIG.freeShippingThreshold || isFreeShippingCoupon) { setShippingFee(0); return; }
    setCalcShipping(true);
    try {
      const res = await fetch('/api/shipping/calculate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weightGrams: totalWeight, pincode }),
      });
      const data = await res.json();
      if (data.success) { setShippingFee(data.shippingFee); setCourierName(data.courierName); setEstDays(data.estimatedDays); }
    } catch { /* keep default */ } finally { setCalcShipping(false); }
  };

  const handleSaveAddr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingAddr(true);
    try {
      const saved = await saveAddress({ ...newAddr, user_id: user.id });
      setAddresses(prev => [...prev, saved]);
      setSelectedAddressId(saved.id);
      setIsAddingNew(false);
      calcShippingFee(saved.pincode || '');
    } finally { setSavingAddr(false); }
  };

  const handlePay = async () => {
    setPayError(''); setStockError('');
    if (!selectedAddress) { setPayError('Please select or add a delivery address.'); return; }
      setPayLoading(true);
    try {
      // Pre-flight stock check (product.stock = variant stock for Frame items)
      for (const item of cart) {
        if (item.product.stock < item.quantity) {
          const label = item.size ? `"${item.product.name}" (${item.size})` : `"${item.product.name}"`;
          setStockError(`${label} only has ${item.product.stock} unit(s) left. Please update your cart.`);
          setPayLoading(false);
          return;
        }
      }

      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: finalTotal, receipt: `rcpt_${Date.now()}` }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) { setPayError('Failed to create payment: ' + orderData.message); setPayLoading(false); return; }

      const cartItems = cart.map(i => ({
        product_id: i.product.id, name: i.product.name,
        price: i.product.price, quantity: i.quantity, image: i.product.images?.[0] || '',
        // Variant fields for Frame products
        variant_id: i.variantId,
        size: i.size,
      }));

      const verifyPayment = async (rpOrderId: string, rpPaymentId: string, rpSig: string) => {
        const vRes = await fetch('/api/razorpay/verify-payment', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: rpOrderId, razorpay_payment_id: rpPaymentId, razorpay_signature: rpSig,
            orderData: { user_id: user?.id || 'demo_user_id', items: cartItems, subtotal, discount_amount: discountAmount, coupon_code: coupon?.code || '', shipping_fee: shippingFee, total: finalTotal, shipping_address: selectedAddress },
          }),
        });
        const vData = await vRes.json();
        if (vData.success) { clearCart(); router.push(`/order-success/${vData.orderId}`); }
        else { setPayError(vData.message || 'Payment verification failed. Please contact support.'); }
      };

      // Load Razorpay script
      if (!(window as any).Razorpay) {
        await new Promise(resolve => {
          const s = document.createElement('script');
          s.src = 'https://checkout.razorpay.com/v1/checkout.js';
          s.onload = () => resolve(true); s.onerror = () => resolve(false);
          document.body.appendChild(s);
        });
      }

      if ((window as any).Razorpay) {
        const rzp = new (window as any).Razorpay({
          key: orderData.key, amount: orderData.amount, currency: 'INR',
          name: STORE_CONFIG.name, description: 'Sriyam Store — Sacred Art Order',
          order_id: orderData.id,
          prefill: { name: selectedAddress.name, email: user?.email || '', contact: selectedAddress.phone },
          theme: { color: '#b45309' },
          handler: (response: any) => verifyPayment(response.razorpay_order_id || orderData.id, response.razorpay_payment_id, response.razorpay_signature),
          modal: { ondismiss: () => setPayLoading(false) },
        });
        rzp.open();
      } else {
        // Offline / test mode fallback
        await verifyPayment(orderData.id, `pay_mock_${Date.now()}`, 'test_signature');
      }
    } catch (e: any) {
      setPayError('An unexpected error occurred. Please try again.');
    } finally {
      setPayLoading(false);
    }
  };

  if (!cartLoaded) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-amber-800" />
        <p className="text-xs text-zinc-500 font-medium">Verifying checkout session...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-amber-800" />
        <p className="text-xs text-zinc-500 font-medium">Redirecting to login...</p>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-serif font-bold text-zinc-900">No Items to Checkout</h2>
        <p className="text-xs text-zinc-500">Your shopping cart is currently empty.</p>
        <Link href="/shop" className="inline-block px-6 py-2.5 bg-zinc-900 text-white font-bold text-xs rounded-lg uppercase tracking-wider hover:bg-amber-800 transition-colors">
          Return to Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="border-b border-zinc-200 pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs text-zinc-500 flex items-center gap-2 mb-1">
            <Link href="/cart" className="hover:text-zinc-900">Cart</Link><span>/</span>
            <span className="text-zinc-900 font-medium">Checkout</span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-zinc-900">Secure Checkout</h1>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
          <Lock className="w-3.5 h-3.5" /><span>256-Bit SSL Encrypted</span>
        </div>
      </div>

      {/* Error banners */}
      {stockError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
          <div><p className="font-bold">Stock Insufficient</p><p>{stockError}</p>
            <Link href="/cart" className="font-bold underline mt-1 inline-block">Update Cart</Link>
          </div>
        </div>
      )}
      {payError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
          <div><p className="font-bold">Payment Error</p><p>{payError}</p>
            <button onClick={() => setPayError('')} className="font-bold underline mt-1">Dismiss</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Address + Shipping */}
        <div className="lg:col-span-7 space-y-6">

          {/* Address */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-800" />
                <h3 className="font-serif font-bold text-lg text-zinc-900">1. Delivery Address</h3>
              </div>
              {!isAddingNew && (
                <button onClick={() => setIsAddingNew(true)} className="text-xs font-bold text-amber-800 hover:underline flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /><span>New Address</span>
                </button>
              )}
            </div>

            {isAddingNew ? (
              <form onSubmit={handleSaveAddr} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[['Recipient Name *', 'name', 'text', 'e.g. Sriram'], ['Phone *', 'phone', 'tel', '+91 98765 43210']].map(([label, field, type, ph]) => (
                    <div key={field} className="space-y-1">
                      <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">{label}</label>
                      <input type={type} required value={(newAddr as any)[field] || ''} onChange={e => setNewAddr({ ...newAddr, [field]: e.target.value })}
                        placeholder={ph} className="w-full border border-zinc-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-amber-700 focus:outline-none" />
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Address Line 1 *</label>
                  <input type="text" required value={newAddr.line1 || ''} onChange={e => setNewAddr({ ...newAddr, line1: e.target.value })}
                    placeholder="House/Flat No., Street, Area" className="w-full border border-zinc-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-amber-700 focus:outline-none" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[['City *', 'city', 'Chennai'], ['State *', 'state', 'Tamil Nadu'], ['Pincode *', 'pincode', '600001']].map(([label, field, ph]) => (
                    <div key={field} className="space-y-1">
                      <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">{label}</label>
                      <input type="text" required value={(newAddr as any)[field] || ''} placeholder={ph}
                        onChange={e => { setNewAddr({ ...newAddr, [field]: e.target.value }); if (field === 'pincode' && e.target.value.length === 6) calcShippingFee(e.target.value); }}
                        className="w-full border border-zinc-300 rounded-lg p-2.5 text-xs font-mono focus:ring-2 focus:ring-amber-700 focus:outline-none" />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  {addresses.length > 0 && <button type="button" onClick={() => setIsAddingNew(false)} className="px-4 py-2 border border-zinc-300 text-xs font-semibold rounded-lg">Cancel</button>}
                  <button type="submit" disabled={savingAddr} className="px-5 py-2.5 bg-amber-800 text-white font-bold text-xs uppercase rounded-lg flex items-center gap-1.5">
                    {savingAddr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    {savingAddr ? 'Saving...' : 'Save & Deliver Here'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                {addresses.map(addr => (
                  <label key={addr.id} className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedAddressId === addr.id ? 'border-amber-700 bg-amber-50/40' : 'border-zinc-200 hover:border-zinc-300'}`}>
                    <input type="radio" name="addr" checked={selectedAddressId === addr.id} onChange={() => { setSelectedAddressId(addr.id); calcShippingFee(addr.pincode); }} className="mt-1 text-amber-800" />
                    <div className="text-xs space-y-0.5">
                      <p className="font-bold text-zinc-900">{addr.name} <span className="font-normal text-zinc-500">({addr.phone})</span></p>
                      <p className="text-zinc-600">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}, {addr.city}, {addr.state} – <span className="font-mono font-bold text-zinc-900">{addr.pincode}</span></p>
                      {addr.is_default && <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Default</span>}
                    </div>
                  </label>
                ))}
              </div>
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
                <p className="font-bold text-zinc-900">{courierName}</p>
                <p className="text-zinc-500">Package weight: <span className="font-semibold text-zinc-800">{totalWeight}g</span></p>
                <p className="text-amber-800 font-medium text-[11px]">Est. delivery: {estDays} business days</p>
              </div>
              <div className="text-right">
                {calcShipping ? (
                  <span className="flex items-center gap-1 text-zinc-400 text-xs animate-pulse"><Loader2 className="w-3 h-3 animate-spin" />Calculating...</span>
                ) : shippingFee === 0 ? (
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
                <span className="font-medium text-zinc-900">{calcShipping ? '...' : shippingFee === 0 ? <span className="text-emerald-600 font-bold">Free</span> : `${STORE_CONFIG.defaultPricing.currency}${shippingFee}`}</span>
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

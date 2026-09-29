'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { STORE_CONFIG } from '@/lib/config';
import { Order } from '@/types';
import {
  Search,
  Package,
  MapPin,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  MessageCircle,
  ArrowRight,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

const STATUS_STEPS = [
  { key: 'paid', label: 'Payment Confirmed', desc: 'Order received & payment verified' },
  { key: 'processing', label: 'Packing & Framing', desc: 'Sacred artwork prepared for dispatch' },
  { key: 'shipped', label: 'Dispatched via Courier', desc: 'In transit to delivery address' },
  { key: 'delivered', label: 'Delivered', desc: 'Delivered to your doorstep' },
];

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const initialOrderId = searchParams.get('orderId') || '';
  const initialContact = searchParams.get('contact') || '';

  const [orderId, setOrderId] = useState(initialOrderId);
  const [contact, setContact] = useState(initialContact);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<Order | null>(null);

  const fetchTracking = async (searchId: string, searchContact: string) => {
    if (!searchId.trim() || !searchContact.trim()) return;

    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: searchId.trim(), contact: searchContact.trim() }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success && data?.order) {
        setOrder(data.order);
      } else {
        setError(data?.message || 'Could not find an order with the provided details.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to retrieve order tracking information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrderId && initialContact) {
      fetchTracking(initialOrderId, initialContact);
    }
  }, [initialOrderId, initialContact]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTracking(orderId, contact);
  };

  const getStepStatus = (stepKey: string, currentStatus: string) => {
    if (currentStatus === 'cancelled') return 'cancelled';
    const statusOrder = ['pending', 'paid', 'shipped', 'delivered'];
    const currentIndex = statusOrder.indexOf(currentStatus);

    if (stepKey === 'paid') return currentIndex >= 1 ? 'completed' : 'pending';
    if (stepKey === 'processing') return currentIndex >= 1 ? (currentIndex > 1 ? 'completed' : 'current') : 'pending';
    if (stepKey === 'shipped') return currentIndex >= 2 ? (currentIndex > 2 ? 'completed' : 'current') : 'pending';
    if (stepKey === 'delivered') return currentIndex >= 3 ? 'completed' : 'pending';
    return 'pending';
  };

  const displayId = order?.order_number || order?.id || orderId;
  const whatsappUrl = `https://wa.me/${STORE_CONFIG.whatsappNumber.replace(/\+/g, '')}?text=${encodeURIComponent(
    `Hi Sriyam Store, I am tracking my order ${displayId}. Can you share the latest delivery status?`
  )}`;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-serif font-bold text-zinc-900">Track Your Order</h1>
        <p className="text-xs text-zinc-500 max-w-md mx-auto">
          Enter your Order ID along with the email or 10-digit mobile number used at checkout to view real-time delivery status.
        </p>
      </div>

      {/* Lookup Form */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 shadow-sm space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="orderId" className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Order ID
              </label>
              <input
                type="text"
                id="orderId"
                required
                placeholder="e.g. SRI001"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-zinc-900 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="contact" className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Email or Mobile Number
              </label>
              <input
                type="text"
                id="contact"
                required
                placeholder="you@example.com or 9876543210"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-lg text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-zinc-900 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-amber-800 disabled:opacity-50 transition-colors shadow-md flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Searching Order...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Track Order</span>
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Order Tracking Result */}
      {order && (
        <div className="space-y-6 animate-fadeIn">
          {/* Order Header Card */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
              <div>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Order Details
                </span>
                <h2 className="text-xl font-serif font-bold text-zinc-900">
                  {displayId}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full border uppercase tracking-wider ${
                  order.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  order.status === 'shipped' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  order.status === 'delivered' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                  order.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-zinc-100 text-zinc-700'
                }`}>
                  {order.status === 'paid' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  {order.status === 'shipped' && <Truck className="w-3.5 h-3.5 text-blue-600" />}
                  {order.status === 'delivered' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />}
                  {order.status === 'cancelled' && <XCircle className="w-3.5 h-3.5 text-red-600" />}
                  <span>{order.status}</span>
                </span>
              </div>
            </div>

            {/* Step Timeline */}
            <div className="pt-2 pb-2">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {STATUS_STEPS.map((step, idx) => {
                  const state = getStepStatus(step.key, order.status);
                  const isDone = state === 'completed';
                  const isCurrent = state === 'current';

                  return (
                    <div
                      key={step.key}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isDone
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : isCurrent
                          ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-400'
                          : 'bg-zinc-50 border-zinc-200/70 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isDone
                            ? 'bg-emerald-600 text-white'
                            : isCurrent
                            ? 'bg-amber-700 text-white'
                            : 'bg-zinc-200 text-zinc-600'
                        }`}>
                          {isDone ? '✓' : idx + 1}
                        </span>
                        <span className={`text-xs font-bold ${isDone ? 'text-emerald-900' : isCurrent ? 'text-amber-900' : 'text-zinc-700'}`}>
                          {step.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 pl-7 leading-tight">{step.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Items & Shipping Summary */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-5">
            <h3 className="font-serif font-bold text-base text-zinc-900 border-b border-zinc-100 pb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-800" />
              Items Ordered
            </h3>

            <div className="divide-y divide-zinc-100">
              {order.items.map((item, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-14 bg-zinc-100 rounded-lg overflow-hidden border border-zinc-200 flex-shrink-0 flex items-center justify-center text-[10px] text-zinc-400 font-bold">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        item.name.slice(0, 4)
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900">{item.name}</p>
                      {item.size && <p className="text-[11px] text-zinc-500">Size: {item.size}</p>}
                      <p className="text-zinc-400">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <span className="font-bold text-zinc-900">
                    {STORE_CONFIG.defaultPricing.currency}
                    {(item.price * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>

            {/* Calculations */}
            <div className="border-t border-zinc-200 pt-3 space-y-1.5 text-xs text-zinc-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-zinc-900">
                  {STORE_CONFIG.defaultPricing.currency}{order.subtotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {(order.discount_amount || 0) > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Discount {order.coupon_code && `(${order.coupon_code})`}</span>
                  <span>-{STORE_CONFIG.defaultPricing.currency}{order.discount_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="font-medium text-zinc-900">
                  {order.shipping_fee === 0 ? <span className="text-emerald-700 font-bold">FREE</span> : `${STORE_CONFIG.defaultPricing.currency}${order.shipping_fee?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                </span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-zinc-200 text-sm font-bold text-zinc-900">
                <span>Total Paid</span>
                <span className="text-lg text-amber-900">
                  {STORE_CONFIG.defaultPricing.currency}{order.total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Delivery Address */}
            {order.shipping_address?.name && (
              <div className="border-t border-zinc-100 pt-4 space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-800" />
                  Delivery Destination
                </h4>
                <p className="text-xs text-zinc-600 bg-zinc-50 p-3 rounded-lg border border-zinc-200 leading-relaxed">
                  <strong className="text-zinc-900">{order.shipping_address.name}</strong> ({order.shipping_address.phone})<br />
                  {order.shipping_address.line1}{order.shipping_address.line2 ? `, ${order.shipping_address.line2}` : ''}<br />
                  {order.shipping_address.city}, {order.shipping_address.state} – <span className="font-mono font-bold text-zinc-900">{order.shipping_address.pincode}</span>
                </p>
              </div>
            )}
          </div>

          {/* Action Button: WhatsApp Customer Care */}
          <div className="text-center pt-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md transition-colors w-full sm:w-auto"
            >
              <MessageCircle className="w-4 h-4 fill-white stroke-none" />
              <span>Inquire on WhatsApp for Live Courier Tracking</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-xs text-zinc-500">Loading tracking...</div>}>
      <TrackOrderContent />
    </Suspense>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { getOrdersByUser } from '@/lib/data';
import { Order } from '@/types';
import { STORE_CONFIG } from '@/lib/config';
import {
  Package, ChevronDown, ChevronUp, MapPin, Clock,
  Truck, CheckCircle2, XCircle, MessageCircle, Loader2, RefreshCw,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pending',   color: 'bg-zinc-100 text-zinc-700 border-zinc-300',           icon: <Clock className="w-3.5 h-3.5" /> },
  paid:      { label: 'Paid',      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',   icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  shipped:   { label: 'Shipped',   color: 'bg-blue-50 text-blue-700 border-blue-200',            icon: <Truck className="w-3.5 h-3.5" /> },
  delivered: { label: 'Delivered', color: 'bg-amber-50 text-amber-800 border-amber-200',         icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  cancelled: { label: 'Cancelled', color: 'bg-red-50 text-red-700 border-red-200',               icon: <XCircle className="w-3.5 h-3.5" /> },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide ${cfg.color}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function OrderCard({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  const displayId = order.order_number || order.id;

  const whatsappText = encodeURIComponent(
    `Hello ${STORE_CONFIG.name}! 🙏\n\nOrder ID: ${displayId}\n\nPlease update me on my order status. Thank you!`
  );
  const waLink = `https://wa.me/${STORE_CONFIG.whatsappNumber.replace(/\+/g, '')}?text=${whatsappText}`;

  return (
    <div className={`bg-white rounded-2xl border transition-all duration-200 shadow-sm overflow-hidden ${open ? 'border-amber-300 shadow-amber-100' : 'border-zinc-200'}`}>
      {/* Header row */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 cursor-pointer hover:bg-zinc-50/50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-10 h-10 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <p className="font-mono text-xs font-bold text-zinc-900 tracking-wide">{displayId}</p>
            <p className="text-[11px] text-zinc-500">
              {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} &nbsp;·&nbsp;
              {order.items.length} item{order.items.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 pl-14 sm:pl-0">
          <StatusBadge status={order.status} />
          <span className="font-extrabold text-zinc-900 text-sm">{STORE_CONFIG.defaultPricing.currency}{order.total?.toLocaleString()}</span>
          {open ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
        </div>
      </div>

      {/* Expanded Detail */}
      {open && (
        <div className="border-t border-zinc-100 p-5 space-y-5">
          {/* Items */}
          <div className="divide-y divide-zinc-100">
            {order.items.map((item, idx) => (
              <div key={idx} className="py-3 flex justify-between items-center text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-11 bg-amber-50 rounded border border-amber-100 flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-amber-900 overflow-hidden">
                    {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : item.name.slice(0, 4)}
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-900">
                      {item.name}
                      {item.size && (
                        <span className="ml-1.5 text-[10px] font-bold bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded border border-zinc-200 uppercase">
                          {item.size}
                        </span>
                      )}
                    </p>
                    <p className="text-zinc-400">Qty: {item.quantity} &times; {STORE_CONFIG.defaultPricing.currency}{item.price}</p>
                  </div>
                </div>
                <span className="font-bold text-zinc-900">{STORE_CONFIG.defaultPricing.currency}{(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div className="bg-zinc-50 rounded-xl p-4 text-xs space-y-1.5 border border-zinc-200">
            <div className="flex justify-between text-zinc-500"><span>Subtotal</span><span>{STORE_CONFIG.defaultPricing.currency}{order.subtotal?.toLocaleString()}</span></div>
            {(order.discount_amount || 0) > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Discount {order.coupon_code && `(${order.coupon_code})`}</span>
                <span>-{STORE_CONFIG.defaultPricing.currency}{order.discount_amount}</span>
              </div>
            )}
            <div className="flex justify-between text-zinc-500">
              <span>Shipping</span>
              <span>{order.shipping_fee === 0 ? <span className="text-emerald-600 font-bold">FREE</span> : `${STORE_CONFIG.defaultPricing.currency}${order.shipping_fee}`}</span>
            </div>
            <div className="pt-2 border-t border-zinc-200 flex justify-between font-extrabold text-zinc-900">
              <span>Total Paid</span><span className="text-amber-900">{STORE_CONFIG.defaultPricing.currency}{order.total?.toLocaleString()}</span>
            </div>
          </div>

          {/* Address */}
          {order.shipping_address && (
            <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200 text-xs space-y-1">
              <p className="font-bold text-zinc-700 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-amber-800" />Shipped To</p>
              <p className="text-zinc-600">
                <span className="font-semibold text-zinc-900">{order.shipping_address.name}</span> ({order.shipping_address.phone}) — {order.shipping_address.line1}, {order.shipping_address.city}, {order.shipping_address.state} – <span className="font-mono font-bold">{order.shipping_address.pincode}</span>
              </p>
            </div>
          )}

          {/* Payment ID */}
          {order.razorpay_payment_id && (
            <p className="text-[11px] font-mono text-zinc-400">Payment: {order.razorpay_payment_id}</p>
          )}

          {/* WhatsApp Support */}
          {order.status !== 'cancelled' && (
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors">
              <MessageCircle className="w-4 h-4 fill-white stroke-none" />Track on WhatsApp
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function AccountOrdersPage() {
  const { user, cartLoaded } = useCart();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = React.useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/account/orders?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
        return;
      }
    } catch (err) {
      console.warn('API orders fetch error, falling back to data helper:', err);
    }

    try {
      const fallbackData = await getOrdersByUser(userId);
      setOrders(fallbackData);
    } catch (fallbackErr) {
      console.error('getOrdersByUser fallback failed:', fallbackErr);
    }
  }, []);

  useEffect(() => {
    if (!cartLoaded) return;
    if (!user) {
      router.push('/login?redirect=/account/orders');
      return;
    }

    setLoading(true);
    fetchOrders(user.id).finally(() => setLoading(false));
  }, [user, cartLoaded, router, fetchOrders]);

  const handleRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await fetchOrders(user.id);
    setRefreshing(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="border-b border-zinc-200 pb-6 flex items-end justify-between">
        <div>
          <p className="text-xs text-zinc-500 mb-1">Account</p>
          <h1 className="text-3xl font-serif font-bold text-zinc-900">My Orders</h1>
        </div>
        {user && (
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            title="Refresh Orders"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 text-amber-800 animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <Package className="w-12 h-12 text-zinc-300 mx-auto" />
          <p className="text-base font-semibold text-zinc-500">No orders yet</p>
          <p className="text-xs text-zinc-400">Your order history will appear here once you make a purchase.</p>
          <Link href="/shop" className="inline-block px-5 py-2.5 bg-amber-800 text-white font-bold text-xs uppercase rounded-lg">Start Shopping</Link>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-zinc-400">{orders.length} order{orders.length !== 1 ? 's' : ''} found</p>
          {orders.map(order => <OrderCard key={order.id} order={order} />)}
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getAllOrders, updateOrderStatus } from '@/lib/data';
import { Order } from '@/types';
import { STORE_CONFIG } from '@/lib/config';
import {
  Package, ChevronDown, ChevronUp, RefreshCw, Loader2,
  AlertTriangle, MapPin, CheckCircle2, Truck, Clock, XCircle, DollarSign, Search, X
} from 'lucide-react';

const STATUSES = ['all', 'pending', 'paid', 'shipped', 'delivered', 'cancelled'] as const;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pending',   color: 'bg-zinc-100 text-zinc-700 border-zinc-300',         icon: <Clock className="w-3.5 h-3.5" /> },
  paid:      { label: 'Paid',      color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  shipped:   { label: 'Shipped',   color: 'bg-blue-50 text-blue-700 border-blue-200',          icon: <Truck className="w-3.5 h-3.5" /> },
  delivered: { label: 'Delivered', color: 'bg-amber-50 text-amber-800 border-amber-200',       icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  cancelled: { label: 'Cancelled', color: 'bg-red-50 text-red-700 border-red-200',             icon: <XCircle className="w-3.5 h-3.5" /> },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide ${cfg.color}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function OrderRow({ order, onStatusChange, onRefund }: {
  order: Order;
  onStatusChange: (id: string, status: Order['status']) => void;
  onRefund: (id: string, paymentId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const displayId = order.order_number || order.id;

  const handleStatus = async (newStatus: Order['status']) => {
    setUpdating(true);
    await onStatusChange(order.id, newStatus);
    setUpdating(false);
  };

  const handleRefund = async () => {
    if (!confirm(`Issue refund for order ${displayId}?\n\nThis will cancel the order and attempt to refund ₹${order.total} via Razorpay.`)) return;
    setRefunding(true);
    await onRefund(order.id, order.razorpay_payment_id ?? '');
    setRefunding(false);
  };

  return (
    <div className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-all ${open ? 'border-amber-300' : 'border-zinc-200'}`}>
      {/* Row header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 cursor-pointer hover:bg-zinc-50/50"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3 text-xs min-w-0">
          <Package className="w-4 h-4 text-amber-800 flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-mono font-bold text-zinc-900 truncate">{displayId}</p>
            <p className="text-zinc-400 text-[11px]">{new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {order.items.length} item{order.items.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 pl-7 sm:pl-0">
          <StatusBadge status={order.status} />
          <span className="font-extrabold text-zinc-900">{STORE_CONFIG.defaultPricing.currency}{order.total?.toLocaleString()}</span>
          {open ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
        </div>
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-zinc-100 p-5 space-y-5">
          {/* Items */}
          <div className="divide-y divide-zinc-100">
            {order.items.map((item, idx) => (
              <div key={idx} className="py-2.5 flex justify-between items-center text-xs">
                <span className="font-semibold text-zinc-900">
                  {item.name}
                  {item.size && (
                    <span className="ml-1.5 text-[10px] font-bold bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded border border-zinc-200 uppercase">
                      {item.size}
                    </span>
                  )}
                  {' '}<span className="font-normal text-zinc-500">×{item.quantity}</span>
                </span>
                <span className="font-bold text-zinc-900">{STORE_CONFIG.defaultPricing.currency}{(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div className="bg-zinc-50 rounded-xl p-4 text-xs space-y-1.5 border border-zinc-200">
            <div className="flex justify-between text-zinc-500"><span>Subtotal</span><span>{STORE_CONFIG.defaultPricing.currency}{order.subtotal?.toLocaleString()}</span></div>
            {(order.discount_amount || 0) > 0 && <div className="flex justify-between text-emerald-700 font-semibold"><span>Discount {order.coupon_code && `(${order.coupon_code})`}</span><span>-{STORE_CONFIG.defaultPricing.currency}{order.discount_amount}</span></div>}
            <div className="flex justify-between text-zinc-500"><span>Shipping</span><span>{order.shipping_fee === 0 ? <span className="text-emerald-600 font-bold">FREE</span> : `${STORE_CONFIG.defaultPricing.currency}${order.shipping_fee}`}</span></div>
            <div className="pt-2 border-t border-zinc-200 flex justify-between font-extrabold text-zinc-900"><span>Total</span><span className="text-amber-900">{STORE_CONFIG.defaultPricing.currency}{order.total?.toLocaleString()}</span></div>
          </div>

          {/* Address */}
          {order.shipping_address && (
            <div className="bg-zinc-50 rounded-xl p-4 text-xs border border-zinc-200">
              <p className="font-bold text-zinc-700 flex items-center gap-1.5 mb-1"><MapPin className="w-3.5 h-3.5 text-amber-800" />Shipping Address</p>
              <p className="text-zinc-600">{order.shipping_address.name} ({order.shipping_address.phone}) — {order.shipping_address.line1}, {order.shipping_address.city}, {order.shipping_address.state} – <span className="font-mono font-bold">{order.shipping_address.pincode}</span></p>
            </div>
          )}

          {/* Payment */}
          {order.razorpay_payment_id && (
            <p className="text-[11px] font-mono text-zinc-400">Razorpay Payment ID: {order.razorpay_payment_id}</p>
          )}

          {/* Admin Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-zinc-100">
            {/* Status update */}
            {order.status !== 'cancelled' && (
              <div className="flex items-center gap-2 flex-1">
                <label className="text-xs font-bold text-zinc-700 whitespace-nowrap">Update Status:</label>
                <select
                  disabled={updating}
                  value={order.status}
                  onChange={e => handleStatus(e.target.value as Order['status'])}
                  className="flex-1 border border-zinc-300 rounded-lg px-2.5 py-2 text-xs focus:ring-2 focus:ring-amber-700 focus:outline-none bg-white"
                >
                  {['pending','paid','shipped','delivered','cancelled'].map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
                {updating && <Loader2 className="w-4 h-4 text-amber-800 animate-spin flex-shrink-0" />}
              </div>
            )}
            {/* Refund */}
            {(order.status === 'paid' || order.status === 'shipped') && order.razorpay_payment_id && (
              <button
                onClick={handleRefund} disabled={refunding}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs uppercase rounded-lg transition-colors"
              >
                {refunding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5" />}
                {refunding ? 'Issuing Refund...' : 'Issue Refund'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Always load ALL orders; filtering is done client-side so tab counts stay accurate.
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await getAllOrders(undefined);
      setAllOrders(data);
    } catch (e: any) { setError(e.message || 'Failed to load orders'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Derive visible orders from the active filter & search query
  const orders = allOrders.filter(o => {
    const matchesFilter = filter === 'all' || o.status === filter;
    if (!matchesFilter) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    const orderNum = (o.order_number || '').toLowerCase();
    const orderId = (o.id || '').toLowerCase();
    const custName = (o.shipping_address?.name || '').toLowerCase();
    const custPhone = (o.shipping_address?.phone || '').toLowerCase();
    const custCity = (o.shipping_address?.city || '').toLowerCase();
    const paymentId = (o.razorpay_payment_id || '').toLowerCase();

    return (
      orderNum.includes(q) ||
      orderId.includes(q) ||
      custName.includes(q) ||
      custPhone.includes(q) ||
      custCity.includes(q) ||
      paymentId.includes(q)
    );
  });

  const handleStatusChange = async (orderId: string, status: Order['status']) => {
    const res = await fetch('/api/orders/update-status', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status }),
    });
    const data = await res.json();
    if (data.success) setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    else setError(data.message || 'Failed to update status');
  };

  const handleRefund = async (orderId: string, paymentId: string) => {
    const res = await fetch('/api/razorpay/create-refund', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, razorpay_payment_id: paymentId }),
    });
    const data = await res.json();
    if (data.success) setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
    else setError(data.message || 'Refund failed');
  };

  // Counts computed from all orders (not the filtered view) so every tab badge is accurate
  const counts: Record<string, number> = {};
  STATUSES.forEach(s => { counts[s] = s === 'all' ? allOrders.length : allOrders.filter(o => o.status === s).length; });
  const totalRevenue = allOrders.filter(o => o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered').reduce((s, o) => s + (o.total || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-serif font-bold text-zinc-900">Orders</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Manage all customer orders</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            Revenue: {STORE_CONFIG.defaultPricing.currency}{totalRevenue.toLocaleString()}
          </div>
          <button onClick={() => { setRefreshing(true); load(); }}
            className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
          <button onClick={() => setError('')} className="ml-auto font-bold underline">Dismiss</button>
        </div>
      )}

      {/* Search and Status Tabs */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Order ID (e.g. SRI001), Customer, Phone, City..."
            className="w-full pl-9 pr-9 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-800 focus:border-amber-800 transition-all placeholder:text-zinc-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-4">
          {STATUSES.map(s => {
            const active = filter === s;
            return (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${active ? 'bg-amber-800 text-white border-amber-800' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'}`}>
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                {filter !== s && <span className="ml-1.5 text-[10px] opacity-60">{counts[s] || 0}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-amber-800 animate-spin" /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 space-y-2">
          <Package className="w-12 h-12 mx-auto text-zinc-300" />
          <p className="font-semibold">
            {searchQuery
              ? `No orders matching "${searchQuery}"`
              : `No orders ${filter !== 'all' ? `with status "${filter}"` : ''}`}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-amber-800 hover:underline font-medium"
            >
              Clear search filter
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <OrderRow key={order.id} order={order} onStatusChange={handleStatusChange} onRefund={handleRefund} />
          ))}
        </div>
      )}
    </div>
  );
}

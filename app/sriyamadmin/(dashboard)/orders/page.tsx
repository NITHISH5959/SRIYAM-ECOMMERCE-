'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getAllOrders, updateOrderStatus } from '@/lib/data';
import { Order } from '@/types';
import { STORE_CONFIG } from '@/lib/config';
import {
  Package, ChevronDown, ChevronUp, RefreshCw, Loader2,
  AlertTriangle, MapPin, CheckCircle2, Truck, Clock, XCircle, DollarSign, Search, X, FileText,
  ShieldAlert, Lock, Eye, EyeOff, KeyRound, AlertCircle
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

function RefundModal({
  order,
  onClose,
  onSuccess,
}: {
  order: Order;
  onClose: () => void;
  onSuccess: (orderId: string, message: string) => void;
}) {
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const displayId = order.order_number || order.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmText.trim();

    if (!trimmedPassword) {
      setError('Please enter the refund password.');
      return;
    }

    if (trimmedPassword !== 'POOVEUNAKAAGA@123') {
      setError('Incorrect refund password. Authorization denied.');
      return;
    }

    if (!trimmedConfirm) {
      setError('Please type "CONFIRM" in the confirmation field.');
      return;
    }

    if (trimmedConfirm !== 'CONFIRM') {
      setError('Confirmation mismatch. You must type exactly "CONFIRM" in capital letters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/razorpay/create-refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          razorpay_payment_id: order.razorpay_payment_id,
          password: trimmedPassword,
          confirmText: trimmedConfirm,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Refund processing failed.');
      }

      onSuccess(order.id, data.message || `Refund issued successfully for Order ${displayId}.`);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to process refund. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white flex-shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide text-white uppercase">Authorize Refund</h3>
              <p className="text-red-100 text-xs">Security Verification Required</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Order Details Highlight */}
          <div className="bg-red-50/70 border border-red-200 rounded-xl p-3.5 text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-zinc-600">Order:</span>
              <span className="font-mono font-bold text-zinc-900 bg-white px-2 py-0.5 rounded border border-zinc-200">
                {displayId}
              </span>
            </div>
            {order.shipping_address?.name && (
              <div className="flex justify-between items-center">
                <span className="font-semibold text-zinc-600">Customer:</span>
                <span className="font-medium text-zinc-900 truncate max-w-[200px]">
                  {order.shipping_address.name}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-red-200/80 flex justify-between items-center">
              <span className="font-bold text-zinc-900">Total Refund:</span>
              <span className="font-extrabold text-red-700 text-base">
                {STORE_CONFIG.defaultPricing.currency}{order.total?.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <p>
              This action will refund the payment via Razorpay and mark the order as <strong>Cancelled</strong>.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Field 1: Enter Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-zinc-800">
              1. Enter the Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                disabled={loading}
                autoFocus
                placeholder="Enter password"
                className="w-full pl-9 pr-10 py-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Field 2: Type CONFIRM */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-baseline">
              <label className="block text-xs font-bold text-zinc-800">
                2. Type CONFIRM <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-zinc-500 font-medium">
                Type <span className="text-red-600 font-mono font-bold">CONFIRM</span> to verify
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={confirmText}
                onChange={e => {
                  setConfirmText(e.target.value);
                  if (error) setError('');
                }}
                disabled={loading}
                placeholder="Type CONFIRM"
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all font-mono tracking-wider uppercase placeholder:normal-case placeholder:tracking-normal"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !password || !confirmText}
              className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl shadow-md shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
              {loading ? 'Issuing Refund...' : 'Confirm Refund'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OrderRow({ order, onStatusChange, onRequestRefund }: {
  order: Order;
  onStatusChange: (id: string, status: Order['status']) => void;
  onRequestRefund: (order: Order) => void;
}) {
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');
  const displayId = order.order_number || order.id;

  const handleStatus = async (newStatus: Order['status']) => {
    setUpdating(true);
    await onStatusChange(order.id, newStatus);
    setUpdating(false);
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
              <p className="text-zinc-600">{order.shipping_address.name} ({order.shipping_address.phone}{(order.contact_email || order.shipping_address.email) ? ` · ${order.contact_email || order.shipping_address.email}` : ''}) — {order.shipping_address.line1}, {order.shipping_address.city}, {order.shipping_address.state} – <span className="font-mono font-bold">{order.shipping_address.pincode}</span></p>
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
            {/* Invoice */}
            {(order.status === 'paid' || order.status === 'shipped' || order.status === 'delivered') && (
              <button
                onClick={async () => {
                  setDownloadingInvoice(true);
                  setInvoiceError('');
                  try {
                    const res = await fetch(`/api/admin/orders/${order.id}/invoice`);
                    if (!res.ok) {
                      const errData = await res.json().catch(() => ({}));
                      throw new Error(errData.error || `Failed (${res.status})`);
                    }
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Invoice-${order.order_number || order.id}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                  } catch (err: any) {
                    setInvoiceError(err?.message || 'Invoice download failed');
                  } finally {
                    setDownloadingInvoice(false);
                  }
                }}
                disabled={downloadingInvoice}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 font-bold text-xs uppercase rounded-lg transition-colors"
              >
                {downloadingInvoice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                {downloadingInvoice ? 'Generating...' : 'Invoice'}
              </button>
            )}
            {invoiceError && (
              <span className="text-[11px] text-red-600 font-medium">{invoiceError}</span>
            )}
            {/* Refund */}
            {(order.status === 'paid' || order.status === 'shipped') && order.razorpay_payment_id && (
              <button
                onClick={() => onRequestRefund(order)}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs uppercase rounded-lg transition-colors"
              >
                <DollarSign className="w-3.5 h-3.5" />
                Issue Refund
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
  const [successMessage, setSuccessMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refundTargetOrder, setRefundTargetOrder] = useState<Order | null>(null);

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
    const custEmail = (o.contact_email || o.shipping_address?.email || '').toLowerCase();
    const custCity = (o.shipping_address?.city || '').toLowerCase();
    const paymentId = (o.razorpay_payment_id || '').toLowerCase();

    return (
      orderNum.includes(q) ||
      orderId.includes(q) ||
      custName.includes(q) ||
      custPhone.includes(q) ||
      custEmail.includes(q) ||
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

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} className="ml-auto font-bold underline">Dismiss</button>
        </div>
      )}

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
            <OrderRow
              key={order.id}
              order={order}
              onStatusChange={handleStatusChange}
              onRequestRefund={setRefundTargetOrder}
            />
          ))}
        </div>
      )}

      {/* Security Verification Refund Modal */}
      {refundTargetOrder && (
        <RefundModal
          order={refundTargetOrder}
          onClose={() => setRefundTargetOrder(null)}
          onSuccess={(orderId, msg) => {
            setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
            setSuccessMessage(msg);
          }}
        />
      )}
    </div>
  );
}

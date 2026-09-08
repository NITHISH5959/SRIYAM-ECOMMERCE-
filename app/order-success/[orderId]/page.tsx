import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getOrderById } from '@/lib/data';
import { STORE_CONFIG } from '@/lib/config';
import { CheckCircle2, Package, MapPin, Truck, MessageCircle, ArrowRight, Clock } from 'lucide-react';

export const revalidate = 0;

interface OrderSuccessProps {
  params: { orderId: string };
}

const STATUS_COLOR: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  shipped: 'bg-blue-50 text-blue-700 border-blue-200',
  delivered: 'bg-amber-50 text-amber-700 border-amber-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  pending: 'bg-zinc-100 text-zinc-600 border-zinc-200',
};

export default async function OrderSuccessPage({ params }: OrderSuccessProps) {
  const order = await getOrderById(params.orderId);

  // Build WhatsApp message
  const itemSummary = order
    ? order.items.map(i => `${i.name} (x${i.quantity})`).join(', ')
    : 'Items';

  const whatsappText = encodeURIComponent(
    `Hi, I just placed an order on Sriyam Store. Order ID: ${params.orderId}, Items: ${itemSummary}, Total: ₹${order?.total || ''}`
  );

  const whatsappLink = `https://wa.me/${STORE_CONFIG.whatsappNumber.replace(/\+/g, '')}?text=${whatsappText}`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 space-y-6">
      {/* Success Hero */}
      <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-xl text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm animate-bounce">
          <CheckCircle2 className="w-10 h-10 stroke-[2]" />
        </div>
        <div className="space-y-2">
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-200">
            ✓ Payment Verified & Order Confirmed
          </span>
          <h1 className="text-3xl font-serif font-bold text-zinc-900 pt-2">
            Thank You for Your Order!
          </h1>
          <p className="text-xs text-zinc-500">
            Order ID:{' '}
            <span className="font-mono font-bold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded">
              {order?.id || params.orderId}
            </span>
          </p>
          {order && (
            <span className={`inline-block text-[11px] font-bold px-3 py-1 rounded-full border uppercase tracking-wider ${STATUS_COLOR[order.status] || STATUS_COLOR.pending}`}>
              {order.status}
            </span>
          )}
        </div>
        <div className="pt-2 text-xs text-zinc-500 flex justify-center items-center gap-2 bg-zinc-50 p-3 rounded-xl border border-zinc-100">
          <Truck className="w-4 h-4 text-amber-700 flex-shrink-0" />
          <span>Items reserved &amp; packed · Estimated delivery: 2 – 4 business days via Express Courier</span>
        </div>
      </div>

      {/* Order Details */}
      {order && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-6">
          <h2 className="font-serif font-bold text-lg text-zinc-900 border-b border-zinc-100 pb-3 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-800" />
            Items Ordered
          </h2>

          <div className="divide-y divide-zinc-100">
            {order.items.map((item, idx) => (
              <div key={idx} className="py-3.5 flex justify-between items-center text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-12 bg-amber-50 rounded border border-amber-100 overflow-hidden flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-amber-900">
                    {item.image ? (
                      <img src={item.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      item.name.slice(0, 4)
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-900">{item.name}</p>
                    <p className="text-zinc-400">Qty: {item.quantity}</p>
                  </div>
                </div>
                <span className="font-bold text-zinc-900">
                  {STORE_CONFIG.defaultPricing.currency}{(item.price * item.quantity).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          {/* Pricing Summary */}
          <div className="border-t border-zinc-200 pt-4 space-y-2 text-xs">
            <div className="flex justify-between text-zinc-500">
              <span>Subtotal</span>
              <span className="font-medium text-zinc-900">{STORE_CONFIG.defaultPricing.currency}{order.subtotal?.toLocaleString()}</span>
            </div>
            {(order.discount_amount || 0) > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Coupon Discount {order.coupon_code && `(${order.coupon_code})`}</span>
                <span>-{STORE_CONFIG.defaultPricing.currency}{order.discount_amount?.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-zinc-500">
              <span>Shipping</span>
              <span className="font-medium text-zinc-900">
                {order.shipping_fee === 0 ? <span className="text-emerald-600 font-bold">FREE</span> : `${STORE_CONFIG.defaultPricing.currency}${order.shipping_fee}`}
              </span>
            </div>
            <div className="pt-2 border-t border-zinc-200 flex justify-between items-baseline font-extrabold text-zinc-900">
              <span>Total Paid</span>
              <span className="text-xl text-amber-900">{STORE_CONFIG.defaultPricing.currency}{order.total?.toLocaleString()}</span>
            </div>
          </div>

          {/* Shipping Address */}
          {order.shipping_address && (
            <div className="border-t border-zinc-100 pt-4 space-y-1.5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-800" />
                Shipping To
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                <span className="font-semibold text-zinc-900">{order.shipping_address.name}</span>
                {' '}({order.shipping_address.phone})<br />
                {order.shipping_address.line1}
                {order.shipping_address.line2 && `, ${order.shipping_address.line2}`},{' '}
                {order.shipping_address.city}, {order.shipping_address.state} –{' '}
                <span className="font-mono font-bold text-zinc-900">{order.shipping_address.pincode}</span>
              </p>
            </div>
          )}

          {/* Payment ID */}
          {order.razorpay_payment_id && (
            <p className="text-[11px] text-zinc-400 font-mono border-t border-zinc-100 pt-3">
              Payment ID: {order.razorpay_payment_id}
            </p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* WhatsApp CTA — primary */}
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="sm:col-span-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-colors"
        >
          <MessageCircle className="w-4 h-4 fill-white stroke-none" />
          <span>Continue on WhatsApp — Track Your Order</span>
        </a>

        <Link
          href="/account/orders"
          className="px-6 py-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors border border-zinc-200"
        >
          <Clock className="w-4 h-4" />
          <span>My Orders</span>
        </Link>
      </div>

      <div className="text-center">
        <Link
          href="/shop"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-amber-800 transition-colors"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}

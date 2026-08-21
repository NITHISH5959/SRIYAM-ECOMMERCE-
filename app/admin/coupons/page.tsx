'use client';

import React, { useState, useEffect } from 'react';
import { Coupon } from '@/types';
import { getCoupons, saveCoupon, deleteCoupon } from '@/lib/data';
import { revalidateStorefront } from '@/app/actions';
import CouponModal from '@/components/admin/CouponModal';
import { Tag, Plus, Edit2, Trash2, CheckCircle2, XCircle, RefreshCw, Sparkles } from 'lucide-react';
import { STORE_CONFIG } from '@/lib/config';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [couponToEdit, setCouponToEdit] = useState<Coupon | null>(null);

  const loadCoupons = async () => {
    setIsLoading(true);
    try {
      const data = await getCoupons();
      setCoupons(data);
    } catch (e) {
      console.error('Failed to load coupons', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleToggleActive = async (coupon: Coupon) => {
    await saveCoupon({
      ...coupon,
      active: !coupon.active,
    });
    await revalidateStorefront();
    await loadCoupons();
  };

  const handleDelete = async (id: string, code: string) => {
    if (confirm(`Are you sure you want to delete coupon code "${code}"?`)) {
      await deleteCoupon(id);
      await revalidateStorefront();
      await loadCoupons();
    }
  };

  const handleOpenAdd = () => {
    setCouponToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (coupon: Coupon) => {
    setCouponToEdit(coupon);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-serif font-bold text-zinc-900">
            Coupon & Discount Management
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Create promotional discount codes: percentage off, flat discounts, or free shipping rules.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadCoupons}
            className="p-2.5 text-zinc-500 hover:text-zinc-900 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
            title="Refresh coupons"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Coupon</span>
          </button>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-600">
            <thead className="bg-zinc-50 text-zinc-700 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-200">
              <tr>
                <th className="py-3.5 px-4">Coupon Code</th>
                <th className="py-3.5 px-4">Discount Type</th>
                <th className="py-3.5 px-4">Value</th>
                <th className="py-3.5 px-4">Min Order</th>
                <th className="py-3.5 px-4">Usage (Used / Limit)</th>
                <th className="py-3.5 px-4">Expiry Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400">
                    No active coupons found. Click "Create Coupon" to add one.
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => {
                  const isExpired =
                    coupon.expires_at && new Date(coupon.expires_at) < new Date();

                  return (
                    <tr key={coupon.id} className="hover:bg-zinc-50/80 transition-colors">
                      {/* Code */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-amber-700" />
                          <span className="font-mono font-bold text-zinc-900 text-xs tracking-wider uppercase bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded">
                            {coupon.code}
                          </span>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-4 font-semibold text-zinc-700 capitalize">
                        {coupon.type.replace('_', ' ')}
                      </td>

                      {/* Value */}
                      <td className="py-3.5 px-4 font-bold text-zinc-900">
                        {coupon.type === 'percentage'
                          ? `${coupon.value}% OFF`
                          : coupon.type === 'flat'
                          ? `${STORE_CONFIG.defaultPricing.currency}${coupon.value} OFF`
                          : 'FREE SHIPPING'}
                      </td>

                      {/* Min Order */}
                      <td className="py-3.5 px-4 font-medium text-zinc-700">
                        {STORE_CONFIG.defaultPricing.currency}
                        {coupon.min_order_value}
                      </td>

                      {/* Usage */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-zinc-800">
                          {coupon.used_count} / {coupon.usage_limit ?? '∞'}
                        </span>
                      </td>

                      {/* Expiry */}
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        {coupon.expires_at ? (
                          <span className={isExpired ? 'text-red-500 font-bold' : 'text-zinc-600'}>
                            {new Date(coupon.expires_at).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-zinc-400">Never</span>
                        )}
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleActive(coupon)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${
                            coupon.active && !isExpired
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200'
                          }`}
                        >
                          {coupon.active && !isExpired ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-zinc-400" />
                              <span>Inactive</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(coupon)}
                            className="p-1.5 text-zinc-600 hover:text-amber-800 hover:bg-amber-50 rounded transition-colors"
                            title="Edit Coupon"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(coupon.id, coupon.code)}
                            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete Coupon"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Coupon Modal */}
      <CouponModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        couponToEdit={couponToEdit}
        onSuccess={loadCoupons}
      />
    </div>
  );
}

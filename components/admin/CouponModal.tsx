'use client';

import React, { useState, useEffect } from 'react';
import { Coupon } from '@/types';
import { saveCoupon } from '@/lib/data';
import { revalidateStorefront } from '@/app/actions';
import { X, Check, Tag } from 'lucide-react';

interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  couponToEdit?: Coupon | null;
  onSuccess: () => void;
}

export default function CouponModal({
  isOpen,
  onClose,
  couponToEdit,
  onSuccess,
}: CouponModalProps) {
  const [formData, setFormData] = useState<Partial<Coupon>>({
    code: '',
    type: 'percentage',
    value: 10,
    min_order_value: 500,
    usage_limit: 100,
    expires_at: '',
    active: true,
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (couponToEdit) {
      setFormData({
        ...couponToEdit,
        expires_at: couponToEdit.expires_at ? couponToEdit.expires_at.split('T')[0] : '',
      });
    } else {
      setFormData({
        code: '',
        type: 'percentage',
        value: 10,
        min_order_value: 500,
        usage_limit: 100,
        expires_at: '',
        active: true,
      });
    }
  }, [couponToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await saveCoupon({
        ...formData,
        code: (formData.code || '').toUpperCase().trim(),
        expires_at: formData.expires_at ? `${formData.expires_at}T23:59:59Z` : null,
      });
      await revalidateStorefront();
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save coupon', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-zinc-200">
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-amber-800" />
            <h3 className="text-lg font-serif font-bold text-zinc-900">
              {couponToEdit ? 'Edit Coupon Code' : 'Create New Coupon'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Coupon Code */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Coupon Code *
            </label>
            <input
              type="text"
              required
              value={formData.code || ''}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g. SRIYAM10"
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-xs font-mono font-bold uppercase tracking-widest text-amber-900 focus:ring-2 focus:ring-amber-700 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Discount Type */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Discount Type *
              </label>
              <select
                value={formData.type || 'percentage'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as 'percentage' | 'flat' | 'free_shipping',
                  })
                }
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-800 focus:ring-2 focus:ring-amber-700 focus:outline-none"
              >
                <option value="percentage">Percentage Off (%)</option>
                <option value="flat">Flat Amount Off (₹)</option>
                <option value="free_shipping">Free Shipping</option>
              </select>
            </div>

            {/* Discount Value */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Value {formData.type === 'percentage' ? '(%)' : '(₹)'}
              </label>
              <input
                type="number"
                disabled={formData.type === 'free_shipping'}
                min="0"
                value={formData.type === 'free_shipping' ? 0 : formData.value ?? 10}
                onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-xs font-bold text-zinc-900 focus:ring-2 focus:ring-amber-700 focus:outline-none disabled:bg-zinc-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Min Order Value */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Min Order Value (₹)
              </label>
              <input
                type="number"
                min="0"
                value={formData.min_order_value ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, min_order_value: Number(e.target.value) })
                }
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-xs font-medium text-zinc-900 focus:ring-2 focus:ring-amber-700 focus:outline-none"
              />
            </div>

            {/* Usage Limit */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Usage Limit
              </label>
              <input
                type="number"
                min="1"
                placeholder="Unlimited"
                value={formData.usage_limit || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    usage_limit: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-xs text-zinc-800 focus:ring-2 focus:ring-amber-700 focus:outline-none"
              />
            </div>
          </div>

          {/* Expiry Date */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Expires On (Optional)
            </label>
            <input
              type="date"
              value={formData.expires_at || ''}
              onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-xs text-zinc-800 focus:ring-2 focus:ring-amber-700 focus:outline-none"
            />
          </div>

          {/* Active Checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer p-2.5 border border-zinc-200 rounded-lg bg-zinc-50 hover:bg-zinc-100">
              <input
                type="checkbox"
                checked={formData.active ?? true}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="w-4 h-4 text-amber-800 rounded border-zinc-300 focus:ring-amber-700"
              />
              <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                Coupon Active & Usable at Checkout
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-zinc-300 text-zinc-700 text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Coupon'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

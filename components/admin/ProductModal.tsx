'use client';

import React, { useState, useEffect } from 'react';
import { Product, Category } from '@/types';
import { saveProduct } from '@/lib/data';
import { revalidateStorefront } from '@/app/actions';
import { createClient } from '@/lib/supabase/client';
import { X, Upload, Check, AlertCircle } from 'lucide-react';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
  categories: Category[];
  onSuccess: () => void;
}

export default function ProductModal({
  isOpen,
  onClose,
  productToEdit,
  categories,
  onSuccess,
}: ProductModalProps) {
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    slug: '',
    description: '',
    price: 599,
    compare_at_price: 649,
    images: [],
    stock: 10,
    category_id: categories[0]?.id || '',
    weight_grams: 300,
    is_active: true,
  });

  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (productToEdit) {
      setFormData({ ...productToEdit });
      setImageUrlInput(productToEdit.images?.[0] || '');
    } else {
      setFormData({
        name: '',
        slug: '',
        description: '',
        price: 599,
        compare_at_price: 649,
        images: [],
        stock: 10,
        category_id: categories[0]?.id || '',
        weight_grams: 300,
        is_active: true,
      });
      setImageUrlInput('');
    }
  }, [productToEdit, categories, isOpen]);

  // Auto generate slug from name
  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setFormData((prev) => ({
      ...prev,
      name,
      slug: productToEdit ? prev.slug || slug : slug,
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (error) {
        throw error;
      }

      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      const uploadedUrl = publicUrlData.publicUrl;
      setImageUrlInput(uploadedUrl);
      setFormData((prev) => ({
        ...prev,
        images: [uploadedUrl],
      }));
    } catch (err: any) {
      const message = err?.message || 'Upload failed';
      console.warn('Storage upload error or unconfigured Supabase bucket.', err);
      setUploadError(`Image upload failed: ${message}. Please paste a public URL instead.`);
      // Do NOT set a blob URL — it is ephemeral and won't survive a page reload
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const imagesToSave = imageUrlInput.trim() ? [imageUrlInput.trim()] : [];
      await saveProduct({
        ...formData,
        images: imagesToSave,
      });
      await revalidateStorefront();
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save product', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-zinc-200">
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
          <h3 className="text-lg font-serif font-bold text-zinc-900">
            {productToEdit ? 'Edit Product' : 'Add New Product'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Product Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={formData.name || ''}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. 3 Rajas Frame"
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-amber-700 focus:outline-none"
              />
            </div>

            {/* Product Slug */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                URL Slug *
              </label>
              <input
                type="text"
                required
                value={formData.slug || ''}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="e.g. 3-rajas"
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-amber-700 focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter details about this spiritual frame or poster..."
              className="w-full border border-zinc-300 rounded-lg p-3 text-xs focus:ring-2 focus:ring-amber-700 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Selling Price */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Price (₹) *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.price ?? 599}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-xs font-bold text-zinc-900 focus:ring-2 focus:ring-amber-700 focus:outline-none"
              />
            </div>

            {/* Compare At Price (MRP) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                MRP (₹)
              </label>
              <input
                type="number"
                min="0"
                value={formData.compare_at_price ?? 649}
                onChange={(e) => setFormData({ ...formData, compare_at_price: Number(e.target.value) })}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-xs text-zinc-600 focus:ring-2 focus:ring-amber-700 focus:outline-none"
              />
            </div>

            {/* Stock */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Stock *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.stock ?? 10}
                onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-xs font-bold text-zinc-900 focus:ring-2 focus:ring-amber-700 focus:outline-none"
              />
            </div>

            {/* Weight in grams */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Weight (g)
              </label>
              <input
                type="number"
                min="0"
                value={formData.weight_grams ?? 300}
                onChange={(e) => setFormData({ ...formData, weight_grams: Number(e.target.value) })}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-xs text-zinc-600 focus:ring-2 focus:ring-amber-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category Select */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Category *
              </label>
              <select
                value={formData.category_id || ''}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-xs text-zinc-800 font-semibold focus:ring-2 focus:ring-amber-700 focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Active Status */}
            <div className="space-y-1 flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer p-2 border border-zinc-200 rounded-lg bg-zinc-50 hover:bg-zinc-100">
                <input
                  type="checkbox"
                  checked={formData.is_active ?? true}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-amber-800 rounded border-zinc-300 focus:ring-amber-700"
                />
                <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                  Active (Visible on Storefront)
                </span>
              </label>
            </div>
          </div>

          {/* Image Upload / Storage */}
          <div className="space-y-2 border-t border-zinc-100 pt-4">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
              Product Image (Supabase Storage or Public URL)
            </label>

            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <input
                type="url"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                placeholder="https://... image url"
                className="w-full flex-1 border border-zinc-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-amber-700 focus:outline-none"
              />

              <label className="w-full sm:w-auto px-4 py-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-700 text-xs font-semibold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploading ? 'Uploading...' : 'Upload File'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>

            {uploadError && (
              <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* Buttons */}
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
              <span>{isSaving ? 'Saving...' : 'Save Product'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

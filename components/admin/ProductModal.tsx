'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Product, Category, ProductVariant } from '@/types';
import { saveProduct, saveVariants, getVariantsByProductId } from '@/lib/data';
import { revalidateStorefront } from '@/app/actions';
import { createClient } from '@/lib/supabase/client';
import {
  X,
  Upload,
  Check,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Trash2,
  ImagePlus,
  Loader2,
} from 'lucide-react';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
  categories: Category[];
  onSuccess: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const FRAMES_SLUG = 'frames';

interface UploadingItem {
  id: string;
  fileName: string;
  progress: 'uploading' | 'error';
  error?: string;
}

interface VariantRow {
  id?: string;
  size: string;
  price: number;
  compare_at_price: number;
  stock: number;
  is_active: boolean;
}

const DEFAULT_VARIANTS: VariantRow[] = [
  { size: 'A3', price: 599, compare_at_price: 649, stock: 10, is_active: true },
  { size: 'A4', price: 799, compare_at_price: 899, stock: 10, is_active: true },
];

// ─── Component ────────────────────────────────────────────────────────────────
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

  const [variants, setVariants] = useState<VariantRow[]>(DEFAULT_VARIANTS.map(v => ({ ...v })));
  const [loadingVariants, setLoadingVariants] = useState(false);

  const [uploadingItems, setUploadingItems] = useState<UploadingItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // Detect if the currently selected category is "Frames"
  const framesCategory = categories.find(c => c.slug === FRAMES_SLUG);
  const isFramesProduct = !!framesCategory && formData.category_id === framesCategory.id;

  // ── Reset on open/productToEdit change ──────────────────────────────────────
  useEffect(() => {
    if (productToEdit) {
      setFormData({ ...productToEdit });
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
    }
    setVariants(DEFAULT_VARIANTS.map(v => ({ ...v })));
    setUploadingItems([]);
    setGlobalError(null);
  }, [productToEdit, categories, isOpen]);

  // ── Load existing variants when editing a Frame product ─────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const cat = categories.find(c => c.slug === FRAMES_SLUG);
    const isFrame = cat && productToEdit?.category_id === cat.id;
    if (!isFrame || !productToEdit?.id) return;

    setLoadingVariants(true);
    getVariantsByProductId(productToEdit.id).then((fetched) => {
      if (fetched.length > 0) {
        setVariants(
          DEFAULT_VARIANTS.map(dv => {
            const existing = fetched.find(fv => fv.size === dv.size);
            if (existing) {
              return {
                id: existing.id,
                size: existing.size,
                price: existing.price,
                compare_at_price: existing.compare_at_price,
                stock: existing.stock,
                is_active: existing.is_active,
              };
            }
            return { ...dv };
          })
        );
      }
    }).finally(() => setLoadingVariants(false));
  }, [isOpen, productToEdit, categories]);

  // ── Auto-generate slug from name ────────────────────────────────────────────
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

  // ── File validation ─────────────────────────────────────────────────────────
  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `"${file.name}" is not allowed. Only JPG, PNG, and WebP images are accepted.`;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `"${file.name}" exceeds the ${MAX_FILE_SIZE_MB} MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`;
    }
    return null;
  };

  // ── Upload a single validated file to Supabase ──────────────────────────────
  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    const tempId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${tempId}.${fileExt}`;
    const filePath = `products/${fileName}`;

    setUploadingItems((prev) => [
      ...prev,
      { id: tempId, fileName: file.name, progress: 'uploading' },
    ]);

    try {
      const supabase = createClient();
      const { error } = await supabase.storage.from('product-images').upload(filePath, file);
      if (error) throw error;
      const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(filePath);
      const url = publicUrlData.publicUrl;
      setUploadingItems((prev) => prev.filter((u) => u.id !== tempId));
      return url;
    } catch (err: any) {
      const msg = err?.message || 'Upload failed';
      setUploadingItems((prev) =>
        prev.map((u) => u.id === tempId ? { ...u, progress: 'error', error: msg } : u)
      );
      return null;
    }
  }, []);

  // ── Process a FileList (from picker or drop) ─────────────────────────────────
  const processFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files);
    setGlobalError(null);
    for (const file of arr) {
      const err = validateFile(file);
      if (err) { setGlobalError(err); return; }
    }
    const newUrls: string[] = [];
    for (const file of arr) {
      const url = await uploadFile(file);
      if (url) newUrls.push(url);
    }
    if (newUrls.length > 0) {
      setFormData((prev) => ({ ...prev, images: [...(prev.images || []), ...newUrls] }));
    }
  }, [uploadFile]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); dragCounter.current += 1; setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); dragCounter.current -= 1; if (dragCounter.current === 0) setIsDragOver(false); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); dragCounter.current = 0; setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const imgs = [...(formData.images || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= imgs.length) return;
    [imgs[index], imgs[targetIndex]] = [imgs[targetIndex], imgs[index]];
    setFormData((prev) => ({ ...prev, images: imgs }));
  };

  const removeImage = (index: number) => {
    const imgs = [...(formData.images || [])];
    imgs.splice(index, 1);
    setFormData((prev) => ({ ...prev, images: imgs }));
  };

  const dismissUploadError = (id: string) => setUploadingItems((prev) => prev.filter((u) => u.id !== id));

  // ── Update a variant field ───────────────────────────────────────────────────
  const updateVariant = (size: string, field: keyof VariantRow, value: number | boolean) => {
    setVariants((prev) => prev.map(v => v.size === size ? { ...v, [field]: value } : v));
  };

  // ── Form submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // For Frames: set products.price to min variant price (powers "From ₹" on cards)
      let productToSave = { ...formData, images: formData.images || [] };
      if (isFramesProduct) {
        const minPrice = Math.min(...variants.map(v => v.price));
        const minMrp = Math.min(...variants.map(v => v.compare_at_price));
        productToSave = { ...productToSave, price: minPrice, compare_at_price: minMrp };
      }

      const saved = await saveProduct(productToSave);

      // Save variants for Frame products
      if (isFramesProduct && saved.id) {
        await saveVariants(saved.id, variants);
      }

      await revalidateStorefront();
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save product', err);
      setGlobalError('Failed to save product. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const images = formData.images || [];
  const isUploading = uploadingItems.some((u) => u.progress === 'uploading');
  const uploadErrors = uploadingItems.filter((u) => u.progress === 'error');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-zinc-200">
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
          <h3 className="text-lg font-serif font-bold text-zinc-900">
            {productToEdit ? 'Edit Product' : 'Add New Product'}
          </h3>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Product Name *</label>
              <input type="text" required value={formData.name || ''} onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. 3 Rajas Frame"
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-amber-700 focus:outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">URL Slug *</label>
              <input type="text" required value={formData.slug || ''} onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="e.g. 3-rajas"
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-amber-700 focus:outline-none" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Description</label>
            <textarea rows={3} value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter details about this spiritual frame or poster..."
              className="w-full border border-zinc-300 rounded-lg p-3 text-xs focus:ring-2 focus:ring-amber-700 focus:outline-none" />
          </div>

          {/* ── Single price/stock — hidden for Frames, shown for Rack Posters ── */}
          {!isFramesProduct && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Price (₹) *</label>
                <input type="number" required min="0" value={formData.price ?? 599}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-xs font-bold text-zinc-900 focus:ring-2 focus:ring-amber-700 focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">MRP (₹)</label>
                <input type="number" min="0" value={formData.compare_at_price ?? 649}
                  onChange={(e) => setFormData({ ...formData, compare_at_price: Number(e.target.value) })}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-xs text-zinc-600 focus:ring-2 focus:ring-amber-700 focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Stock *</label>
                <input type="number" required min="0" value={formData.stock ?? 10}
                  onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-xs font-bold text-zinc-900 focus:ring-2 focus:ring-amber-700 focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Weight (g)</label>
                <input type="number" min="0" value={formData.weight_grams ?? 300}
                  onChange={(e) => setFormData({ ...formData, weight_grams: Number(e.target.value) })}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-xs text-zinc-600 focus:ring-2 focus:ring-amber-700 focus:outline-none" />
              </div>
            </div>
          )}

          {/* Weight field shown for Frames too */}
          {isFramesProduct && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Weight (g)</label>
                <input type="number" min="0" value={formData.weight_grams ?? 300}
                  onChange={(e) => setFormData({ ...formData, weight_grams: Number(e.target.value) })}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-xs text-zinc-600 focus:ring-2 focus:ring-amber-700 focus:outline-none" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Category *</label>
              <select value={formData.category_id || ''} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-xs text-zinc-800 font-semibold focus:ring-2 focus:ring-amber-700 focus:outline-none">
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1 flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer p-2 border border-zinc-200 rounded-lg bg-zinc-50 hover:bg-zinc-100">
                <input type="checkbox" checked={formData.is_active ?? true}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-amber-800 rounded border-zinc-300 focus:ring-amber-700" />
                <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Active (Visible on Storefront)</span>
              </label>
            </div>
          </div>

          {/* ── Sizes section — Frames only ──────────────────────────────────── */}
          {isFramesProduct && (
            <div className="space-y-3 border-t border-zinc-100 pt-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Sizes (A3 & A4)</label>
                {loadingVariants && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />}
              </div>
              <p className="text-[10px] text-zinc-400">The lowest price is shown as "From ₹…" on product cards.</p>
              <div className="rounded-xl border border-zinc-200 overflow-hidden divide-y divide-zinc-100">
                {/* Table header */}
                <div className="grid grid-cols-4 gap-0 bg-zinc-50 px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  <span>Size</span>
                  <span>Price (₹)</span>
                  <span>MRP (₹)</span>
                  <span>Stock</span>
                </div>
                {variants.map((v) => (
                  <div key={v.size} className="grid grid-cols-4 gap-2 px-3 py-2.5 items-center">
                    <span className="text-xs font-bold text-zinc-800 bg-zinc-100 px-2 py-1 rounded w-fit">{v.size}</span>
                    <input type="number" min="0" value={v.price}
                      onChange={(e) => updateVariant(v.size, 'price', Number(e.target.value))}
                      className="border border-zinc-300 rounded-lg px-2 py-1.5 text-xs font-bold text-zinc-900 focus:ring-2 focus:ring-amber-700 focus:outline-none w-full" />
                    <input type="number" min="0" value={v.compare_at_price}
                      onChange={(e) => updateVariant(v.size, 'compare_at_price', Number(e.target.value))}
                      className="border border-zinc-300 rounded-lg px-2 py-1.5 text-xs text-zinc-500 focus:ring-2 focus:ring-amber-700 focus:outline-none w-full" />
                    <input type="number" min="0" value={v.stock}
                      onChange={(e) => updateVariant(v.size, 'stock', Number(e.target.value))}
                      className="border border-zinc-300 rounded-lg px-2 py-1.5 text-xs font-bold text-zinc-900 focus:ring-2 focus:ring-amber-700 focus:outline-none w-full" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Multi-Image Upload Section ─────────────────────────────────────── */}
          <div className="space-y-3 border-t border-zinc-100 pt-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Product Images</label>
              <span className="text-[10px] text-zinc-400 font-medium">JPG · PNG · WebP · Max {MAX_FILE_SIZE_MB} MB each</span>
            </div>

            <div
              onDragEnter={handleDragEnter} onDragLeave={handleDragLeave}
              onDragOver={handleDragOver} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-colors p-6 flex flex-col items-center justify-center gap-2 select-none ${isDragOver ? 'border-amber-600 bg-amber-50' : 'border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100'}`}
            >
              <input ref={fileInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={handleFileInputChange} className="hidden" />
              <ImagePlus className={`w-7 h-7 ${isDragOver ? 'text-amber-700' : 'text-zinc-400'}`} />
              <p className="text-xs font-semibold text-zinc-600">{isDragOver ? 'Drop images here' : 'Drop images here or click to browse'}</p>
              <p className="text-[10px] text-zinc-400">Select multiple files to upload all at once</p>
            </div>

            {globalError && (
              <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div className="flex-1"><span>{globalError}</span></div>
                <button type="button" onClick={() => setGlobalError(null)} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}

            {uploadErrors.map((item) => (
              <div key={item.id} className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div className="flex-1"><p className="font-semibold">{item.fileName}</p><p>{item.error}</p></div>
                <button type="button" onClick={() => dismissUploadError(item.id)} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}

            {uploadingItems.filter((u) => u.progress === 'uploading').map((item) => (
              <div key={item.id} className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                <span className="truncate">Uploading {item.fileName}…</span>
              </div>
            ))}

            {images.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                  {images.length} image{images.length !== 1 ? 's' : ''} — first is used as thumbnail
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {images.map((url, idx) => (
                    <div key={`${url}-${idx}`} className="relative group rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100 aspect-[4/5]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Product image ${idx + 1}`} className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute top-1.5 left-1.5 bg-amber-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">Thumbnail</span>
                      )}
                      <span className="absolute top-1.5 right-1.5 bg-black/50 text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{idx + 1}</span>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                        <button type="button" onClick={() => moveImage(idx, 'up')} disabled={idx === 0} title="Move up"
                          className="p-1 bg-white/90 rounded text-zinc-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => removeImage(idx)} title="Remove image"
                          className="p-1 bg-red-600 rounded text-white hover:bg-red-700 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => moveImage(idx, 'down')} disabled={idx === images.length - 1} title="Move down"
                          className="p-1 bg-white/90 rounded text-zinc-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 border border-zinc-300 text-zinc-700 text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-zinc-100">
              Cancel
            </button>
            <button type="submit" disabled={isSaving || isUploading}
              className="px-6 py-2.5 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-60">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{isSaving ? 'Saving…' : isUploading ? 'Uploading…' : 'Save Product'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

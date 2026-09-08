'use client';

import React, { useState, useEffect } from 'react';
import { Product, Category } from '@/types';
import { getAllProductsAdmin, getCategories } from '@/lib/data';
import { deleteProductAction, revalidateStorefront } from '@/app/actions';
import ProductModal from '@/components/admin/ProductModal';
import PlaceholderImage from '@/components/ui/PlaceholderImage';
import { Plus, Edit2, Trash2, Search, PackageCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { STORE_CONFIG } from '@/lib/config';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        getAllProductsAdmin(),
        getCategories(),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (e) {
      console.error('Failed to load admin products data', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await deleteProductAction(id);
        await loadData();
      } catch (err: any) {
        alert(`Failed to delete product: ${err?.message || 'Unknown error'}`);
      }
    }
  };

  const handleOpenAdd = () => {
    setProductToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setProductToEdit(product);
    setIsModalOpen(true);
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.slug && p.slug.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || p.category_id === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-serif font-bold text-zinc-900">
            Product Management
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Manage your Sriyam Store catalog: pricing, compare-at MRP, stock, and Supabase images.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 text-zinc-500 hover:text-zinc-900 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-zinc-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search products by name or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-zinc-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-700 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-zinc-600">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-zinc-50 border border-zinc-300 rounded-lg px-3 py-2 text-xs font-medium text-zinc-800 focus:ring-2 focus:ring-amber-700"
          >
            <option value="all">All Categories ({products.length})</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-600">
            <thead className="bg-zinc-50 text-zinc-700 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-200">
              <tr>
                <th className="py-3.5 px-4">Product</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Price</th>
                <th className="py-3.5 px-4">MRP</th>
                <th className="py-3.5 px-4">Stock</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">
                    No products matching criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const hasImage =
                    product.images &&
                    product.images.length > 0 &&
                    product.images[0].trim() !== '';

                  return (
                    <tr key={product.id} className="hover:bg-zinc-50/80 transition-colors">
                      {/* Product Name & Image */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-12 rounded bg-zinc-100 border border-zinc-200 overflow-hidden flex-shrink-0 flex items-center justify-center text-[9px] text-zinc-400">
                            {hasImage ? (
                              <img
                                src={product.images[0]}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="font-semibold text-center px-1">
                                {product.name.slice(0, 6)}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-zinc-900 text-xs">
                              {product.name}
                            </p>
                            <p className="text-[10px] text-zinc-400 font-mono">
                              /{product.slug}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="bg-zinc-100 text-zinc-700 font-medium px-2 py-0.5 rounded text-[10px]">
                          {product.category?.name || 'Unassigned'}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 font-bold text-zinc-900">
                        {STORE_CONFIG.defaultPricing.currency}
                        {product.price}
                      </td>

                      {/* Compare At Price */}
                      <td className="py-3 px-4 text-zinc-400 line-through">
                        {STORE_CONFIG.defaultPricing.currency}
                        {product.compare_at_price}
                      </td>

                      {/* Stock */}
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold ${
                            product.stock > 0 ? 'text-zinc-800' : 'text-red-600 font-bold'
                          }`}
                        >
                          {product.stock} units
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {product.is_active ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-zinc-100 text-zinc-500 text-[10px] font-bold px-2 py-0.5 rounded">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(product)}
                            className="p-1.5 text-zinc-600 hover:text-amber-800 hover:bg-amber-50 rounded transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id, product.name)}
                            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete Product"
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

      {/* Add / Edit Product Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        productToEdit={productToEdit}
        categories={categories}
        onSuccess={loadData}
      />
    </div>
  );
}

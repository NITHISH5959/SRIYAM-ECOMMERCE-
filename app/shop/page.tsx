import React from 'react';
import { getProducts, getCategories } from '@/lib/data';
import ProductCard from '@/components/products/ProductCard';
import SortSelector from '@/components/products/SortSelector';
import Link from 'next/link';
import { SlidersHorizontal, Package } from 'lucide-react';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shop Sacred Art — Spiritual Frames & Heritage Posters',
  description:
    'Browse Sriyam Store\'s full collection of sacred spiritual frames, Paadal Petra Sthalam posters, Divya Desam charts, Sakthi Peedam maps and more. Authentic heritage art starting at ₹599.',
  openGraph: {
    title: 'Shop Sacred Art — Sriyam Store',
    description:
      'Authentic spiritual frames and heritage rack posters. Paadal Petra Sthalam, Divya Desam, Sakthi Peedam and more.',
    type: 'website',
    url: 'https://sriyamstore.com/shop',
  },
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ShopPageProps {
  searchParams: {
    category?: string;
    sort?: string;
  };
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const currentCategory = searchParams.category || 'all';
  const currentSort = searchParams.sort || 'default';

  const [categories, rawProducts] = await Promise.all([
    getCategories(),
    getProducts(currentCategory),
  ]);
  let products = rawProducts.filter((p) => p.is_active !== false);

  // Sorting logic
  if (currentSort === 'price-low') {
    products = [...products].sort((a, b) => a.price - b.price);
  } else if (currentSort === 'price-high') {
    products = [...products].sort((a, b) => b.price - a.price);
  } else if (currentSort === 'name') {
    products = [...products].sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Breadcrumb & Header */}
      <div className="border-b border-zinc-200 pb-6">
        <div className="text-xs text-zinc-500 flex items-center gap-2 mb-2">
          <Link href="/" className="hover:text-zinc-900 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-zinc-900 font-medium capitalize">
            {currentCategory === 'all' ? 'All Products' : currentCategory.replace(/-/g, ' ')}
          </span>
        </div>
        <h1 className="text-3xl font-serif font-bold text-zinc-900">
          {currentCategory === 'all'
            ? 'All Sacred Products'
            : currentCategory === 'frames'
            ? 'Sacred Frames'
            : 'Heritage Rack Posters'}
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-1">
          Showing {products.length} divine products with standard pricing & high quality print.
        </p>
      </div>

      {/* Filter Tabs & Sort Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-zinc-100/60 p-3 rounded-xl border border-zinc-200/70">
        
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/shop"
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              currentCategory === 'all'
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'bg-white text-zinc-600 hover:text-zinc-900 border border-zinc-200'
            }`}
          >
            All Products
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/shop?category=${cat.slug}`}
              className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                currentCategory === cat.slug
                  ? 'bg-amber-800 text-white shadow-sm'
                  : 'bg-white text-zinc-600 hover:text-zinc-900 border border-zinc-200'
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <SlidersHorizontal className="w-4 h-4 text-zinc-500" />
          <span className="text-xs font-medium text-zinc-600 hidden sm:inline">Sort:</span>
          <SortSelector currentSort={currentSort} />
        </div>

      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-zinc-200 p-8 space-y-3">
          <Package className="w-12 h-12 text-zinc-300 mx-auto" />
          <h3 className="text-lg font-semibold text-zinc-800">No Products Found</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            No active products found in this category. Try selecting another filter.
          </p>
          <Link
            href="/shop"
            className="inline-block px-4 py-2 bg-zinc-900 text-white text-xs font-semibold uppercase tracking-wider rounded-md mt-4 hover:bg-zinc-800"
          >
            Reset Filters
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

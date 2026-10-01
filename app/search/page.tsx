import React from 'react';
import { searchProducts } from '@/lib/data';
import ProductCard from '@/components/products/ProductCard';
import SortSelector from '@/components/products/SortSelector';
import Link from 'next/link';
import { SlidersHorizontal, Package, Search } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search Sacred Art & Heritage Prints — Sriyam Store',
  description: 'Search authentic spiritual frames and heritage posters at Sriyam Store.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface SearchPageProps {
  searchParams: {
    q?: string;
    sort?: string;
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = (searchParams.q || '').trim();
  const currentSort = searchParams.sort || 'default';

  const rawProducts = query ? await searchProducts(query, 24) : [];
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
          <Link href="/" className="hover:text-zinc-900 transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-zinc-900 transition-colors">
            Shop
          </Link>
          <span>/</span>
          <span className="text-zinc-900 font-medium">Search</span>
        </div>
        <h1 className="text-3xl font-serif font-bold text-zinc-900">
          {query ? (
            <>
              Search Results for <span className="text-amber-800">&ldquo;{query}&rdquo;</span>
            </>
          ) : (
            'Search Products'
          )}
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-1">
          {query
            ? `Found ${products.length} product${products.length === 1 ? '' : 's'} matching your search.`
            : 'Enter a keyword above to find sacred frames and posters.'}
        </p>
      </div>

      {/* Filter Tabs & Sort Controls */}
      {products.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-zinc-100/60 p-3 rounded-xl border border-zinc-200/70">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
            <Search className="w-4 h-4 text-zinc-400" />
            <span>Showing results for &ldquo;{query}&rdquo;</span>
          </div>

          {/* Sorting Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <SlidersHorizontal className="w-4 h-4 text-zinc-500" />
            <span className="text-xs font-medium text-zinc-600 hidden sm:inline">Sort:</span>
            <SortSelector currentSort={currentSort} />
          </div>
        </div>
      )}

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-zinc-200 p-8 space-y-3">
          <Package className="w-12 h-12 text-zinc-300 mx-auto" />
          <h3 className="text-lg font-semibold text-zinc-800">
            {query ? `No products found for "${query}"` : 'Please enter a search query'}
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {query
              ? 'Try checking your spelling or search using a broader keyword like "Frames", "Posters", or temple names.'
              : 'Use the search bar in the header to search across all sacred artworks.'}
          </p>
          <div className="pt-2">
            <Link
              href="/shop"
              className="inline-block px-4 py-2 bg-zinc-900 text-white text-xs font-semibold uppercase tracking-wider rounded-md hover:bg-zinc-800 transition-colors"
            >
              Shop All Products
            </Link>
          </div>
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

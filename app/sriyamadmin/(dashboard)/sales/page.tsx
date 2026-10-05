'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { STORE_CONFIG } from '@/lib/config';
import {
  TrendingUp,
  RefreshCw,
  ShoppingBag,
  PackageCheck,
  Boxes,
  IndianRupee,
  Layers,
  Search,
  X,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info,
  Layers3,
  BarChart3,
  Percent,
} from 'lucide-react';
import {
  SalesApiResponse,
  SalesSummary,
  CategorySales,
  CategoryInventory,
  ProductSalesRow,
} from '@/app/api/admin/sales/route';

type DateRange = 'all' | 'today' | '7d' | '30d';

type SortField = 'revenue' | 'unitsSold' | 'stockLeft' | 'inventoryValue' | 'name';
type SortOrder = 'asc' | 'desc';

const DATE_RANGES: { id: DateRange; label: string }[] = [
  { id: 'all', label: 'All time' },
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
];

export default function AdminSalesPage() {
  const [selectedRange, setSelectedRange] = useState<DateRange>('all');
  const [data, setData] = useState<SalesApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('revenue');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const fetchSalesData = useCallback(async (range: DateRange, isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const res = await fetch(`/api/admin/sales?range=${range}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to fetch sales data (${res.status})`);
      }
      const json: SalesApiResponse = await res.json();
      setData(json);
    } catch (err: any) {
      console.error('Error fetching sales analytics:', err);
      setError(err?.message || 'Failed to load sales analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSalesData(selectedRange);
  }, [selectedRange, fetchSalesData]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Filter & Sort product sales
  const products = data?.productSales || [];
  const filteredProducts = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      p.categoryName.toLowerCase().includes(q) ||
      (p.slug && p.slug.toLowerCase().includes(q))
    );
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else {
      comparison = (a[sortField] || 0) - (b[sortField] || 0);
    }
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  const currencySymbol = STORE_CONFIG.defaultPricing.currency || '₹';

  return (
    <div className="space-y-6">
      {/* ── Page Header Bar ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-serif font-bold text-zinc-900">Sales Overview</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Track revenue, units sold and inventory value across your catalog.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchSalesData(selectedRange, true)}
            disabled={loading || refreshing}
            className="p-2.5 text-zinc-500 hover:text-zinc-900 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors disabled:opacity-50"
            title="Refresh sales data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing || loading ? 'animate-spin text-amber-800' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Error Banner ─────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchSalesData(selectedRange)}
            className="font-bold underline hover:text-red-950"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Date Filter Pills ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-zinc-700 mr-1">Period:</span>
          {DATE_RANGES.map((r) => {
            const active = selectedRange === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setSelectedRange(r.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  active
                    ? 'bg-amber-800 text-white border-amber-800 shadow-sm'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        <div className="text-[11px] text-zinc-500 font-medium flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
          <span>Active Window: <strong>{data?.rangeLabel || 'All Time'}</strong> (IST)</span>
        </div>
      </div>

      {/* ── 1. Summary Cards Row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Revenue</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <IndianRupee className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-serif font-bold text-zinc-900 truncate">
              {currencySymbol}
              {(data?.summary.totalRevenue ?? 0).toLocaleString('en-IN')}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Paid & Delivered</p>
          </div>
        </div>

        {/* Orders Count */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Orders</span>
            <div className="p-1.5 bg-amber-50 text-amber-800 rounded-lg">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-serif font-bold text-zinc-900 truncate">
              {(data?.summary.ordersCount ?? 0).toLocaleString('en-IN')}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Counted sales</p>
          </div>
        </div>

        {/* Units Sold */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Units Sold</span>
            <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
              <PackageCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-serif font-bold text-zinc-900 truncate">
              {(data?.summary.unitsSold ?? 0).toLocaleString('en-IN')}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Items dispatched</p>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Avg Order Value</span>
            <div className="p-1.5 bg-purple-50 text-purple-700 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-serif font-bold text-zinc-900 truncate">
              {currencySymbol}
              {(data?.summary.averageOrderValue ?? 0).toLocaleString('en-IN')}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Per qualifying order</p>
          </div>
        </div>

        {/* Inventory Value (Live) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Inventory Value</span>
            <div className="p-1.5 bg-amber-900/10 text-amber-900 rounded-lg">
              <Boxes className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-serif font-bold text-amber-900 truncate">
              {currencySymbol}
              {(data?.summary.inventoryValue ?? 0).toLocaleString('en-IN')}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">At selling price (Live)</p>
          </div>
        </div>

        {/* Units in Stock (Live) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Units in Stock</span>
            <div className="p-1.5 bg-zinc-100 text-zinc-700 rounded-lg">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-serif font-bold text-zinc-900 truncate">
              {(data?.summary.unitsInStock ?? 0).toLocaleString('en-IN')}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Catalog total (Live)</p>
          </div>
        </div>
      </div>

      {/* ── 2 & 3. Category Analytics (Sales & Inventory) ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Category Card */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 text-amber-800 rounded-lg">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900">Sales by Category</h3>
                  <p className="text-[11px] text-zinc-400">
                    Revenue and volume distribution for {data?.rangeLabel || 'All Time'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Items Revenue</span>
                <span className="text-xs font-bold text-zinc-900">
                  {currencySymbol}{(data?.totalItemsRevenue ?? 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Category Rows */}
            <div className="divide-y divide-zinc-100 mt-4">
              {(!data?.categorySales || data.categorySales.length === 0) ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  No sales recorded yet for this period.
                </div>
              ) : (
                data.categorySales.map((cat) => (
                  <div key={cat.id} className="py-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900">{cat.name}</span>
                        <span className="text-[11px] text-zinc-400">
                          ({cat.unitsSold.toLocaleString('en-IN')} sold)
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-zinc-900">
                          {currencySymbol}{cat.revenue.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[11px] font-mono font-semibold text-amber-900 w-12 text-right">
                          {cat.revenueShare.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar in Sriyam Brown/Amber */}
                    <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-amber-800 h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${Math.min(100, Math.max(0, cat.revenueShare))}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footnote on shipping and discounts */}
          <div className="pt-4 mt-4 border-t border-zinc-100 flex items-start gap-1.5 text-[10px] text-zinc-400 italic">
            <Info className="w-3 h-3 flex-shrink-0 mt-0.5 text-zinc-400" />
            <span>Shipping fees and coupon discounts are applied at order level and are not split by category.</span>
          </div>
        </div>

        {/* Inventory by Category Card */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 text-amber-800 rounded-lg">
                  <Layers3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900">Inventory by Category</h3>
                  <p className="text-[11px] text-zinc-400">
                    Live stock units and catalog inventory valuation
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded uppercase">
                Live Catalog
              </span>
            </div>

            {/* Inventory Table */}
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    <th className="py-2.5 px-2">Category</th>
                    <th className="py-2.5 px-2 text-right">Units in Stock</th>
                    <th className="py-2.5 px-2 text-right">Inventory Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {(!data?.categoryInventory || data.categoryInventory.length === 0) ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-zinc-400">
                        No inventory data available.
                      </td>
                    </tr>
                  ) : (
                    data.categoryInventory.map((cat) => (
                      <tr key={cat.id} className="hover:bg-zinc-50/60 transition-colors">
                        <td className="py-3 px-2 font-semibold text-zinc-800">{cat.name}</td>
                        <td className="py-3 px-2 text-right text-zinc-600">
                          {cat.unitsInStock <= 0 ? (
                            <span className="text-red-600 font-semibold">0</span>
                          ) : (
                            <span>{cat.unitsInStock.toLocaleString('en-IN')}</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right font-bold text-zinc-900">
                          {currencySymbol}{cat.inventoryValue.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-zinc-200 font-bold bg-zinc-50/70 text-zinc-900 text-xs">
                    <td className="py-3 px-2">Total</td>
                    <td className="py-3 px-2 text-right font-extrabold text-zinc-900">
                      {(data?.totalInventoryUnits ?? 0).toLocaleString('en-IN')} units
                    </td>
                    <td className="py-3 px-2 text-right font-extrabold text-amber-900">
                      {currencySymbol}{(data?.totalInventoryValue ?? 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-zinc-100 text-[10px] text-zinc-400">
            * Frame inventory is calculated from active A3 and A4 size variants.
          </div>
        </div>
      </div>

      {/* ── 4. Product-wise Performance Table ────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden space-y-4">
        {/* Table Controls Bar */}
        <div className="p-5 border-b border-zinc-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Product-wise Breakdown</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Individual product revenue, unit volume, current stock, and valuation ({sortedProducts.length} items)
            </p>
          </div>

          {/* Search Box in same style as product management table */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search products by name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-zinc-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-700 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Products Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-600">
            <thead className="bg-zinc-50 text-zinc-700 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-200">
              <tr>
                <th
                  onClick={() => handleSort('name')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-zinc-100 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Product</span>
                    {sortField === 'name' ? (
                      sortOrder === 'desc' ? <ArrowDown className="w-3 h-3 text-amber-800" /> : <ArrowUp className="w-3 h-3 text-amber-800" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                    )}
                  </div>
                </th>

                <th className="py-3.5 px-4">Category</th>

                <th
                  onClick={() => handleSort('unitsSold')}
                  className="py-3.5 px-4 text-right cursor-pointer hover:bg-zinc-100 transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Units Sold</span>
                    {sortField === 'unitsSold' ? (
                      sortOrder === 'desc' ? <ArrowDown className="w-3 h-3 text-amber-800" /> : <ArrowUp className="w-3 h-3 text-amber-800" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                    )}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('revenue')}
                  className="py-3.5 px-4 text-right cursor-pointer hover:bg-zinc-100 transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Revenue</span>
                    {sortField === 'revenue' ? (
                      sortOrder === 'desc' ? <ArrowDown className="w-3 h-3 text-amber-800" /> : <ArrowUp className="w-3 h-3 text-amber-800" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                    )}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('stockLeft')}
                  className="py-3.5 px-4 text-right cursor-pointer hover:bg-zinc-100 transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Stock Left</span>
                    {sortField === 'stockLeft' ? (
                      sortOrder === 'desc' ? <ArrowDown className="w-3 h-3 text-amber-800" /> : <ArrowUp className="w-3 h-3 text-amber-800" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                    )}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('inventoryValue')}
                  className="py-3.5 px-4 text-right cursor-pointer hover:bg-zinc-100 transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Inventory Value</span>
                    {sortField === 'inventoryValue' ? (
                      sortOrder === 'desc' ? <ArrowDown className="w-3 h-3 text-amber-800" /> : <ArrowUp className="w-3 h-3 text-amber-800" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100">
              {sortedProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-zinc-400">
                    <Boxes className="w-10 h-10 mx-auto text-zinc-300 mb-2" />
                    <p className="font-semibold">
                      {searchQuery ? `No products matching "${searchQuery}"` : 'No sales yet'}
                    </p>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="text-xs text-amber-800 hover:underline font-medium mt-1"
                      >
                        Clear search filter
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                sortedProducts.map((p) => {
                  const hasImage = p.image && p.image.trim() !== '';

                  return (
                    <tr key={p.id} className="hover:bg-zinc-50/80 transition-colors">
                      {/* Product Thumbnail & Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-12 rounded bg-zinc-100 border border-zinc-200 overflow-hidden flex-shrink-0 flex items-center justify-center text-[9px] text-zinc-400">
                            {hasImage ? (
                              <img
                                src={p.image}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="font-semibold text-center px-1">
                                {p.name.slice(0, 6)}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-zinc-900 text-xs truncate max-w-[200px] sm:max-w-xs">
                              {p.name}
                            </p>
                            {p.slug && (
                              <p className="text-[10px] text-zinc-400 font-mono truncate">
                                /{p.slug}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-3.5 px-4">
                        <span className="bg-zinc-100 text-zinc-700 font-medium px-2 py-0.5 rounded text-[10px]">
                          {p.categoryName}
                        </span>
                      </td>

                      {/* Units Sold */}
                      <td className="py-3.5 px-4 text-right font-medium text-zinc-900">
                        {p.unitsSold > 0 ? (
                          <span className="font-bold text-zinc-900">{p.unitsSold.toLocaleString('en-IN')}</span>
                        ) : (
                          <span className="text-zinc-400">0</span>
                        )}
                      </td>

                      {/* Revenue */}
                      <td className="py-3.5 px-4 text-right">
                        {p.revenue > 0 ? (
                          <span className="font-bold text-emerald-800">
                            {currencySymbol}{p.revenue.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-zinc-400">{currencySymbol}0</span>
                        )}
                      </td>

                      {/* Stock Left */}
                      <td className="py-3.5 px-4 text-right">
                        {p.stockLeft <= 0 ? (
                          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded border border-red-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            0 (Out)
                          </span>
                        ) : p.stockLeft <= 5 ? (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {p.stockLeft} (Low)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {p.stockLeft} units
                          </span>
                        )}
                      </td>

                      {/* Inventory Value */}
                      <td className="py-3.5 px-4 text-right font-bold text-zinc-900">
                        {currencySymbol}{p.inventoryValue.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

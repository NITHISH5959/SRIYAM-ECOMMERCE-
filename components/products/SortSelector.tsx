'use client';

import React from 'react';

interface SortSelectorProps {
  currentSort: string;
}

export default function SortSelector({ currentSort }: SortSelectorProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sort = e.target.value;
    const url = new URL(window.location.href);
    url.searchParams.set('sort', sort);
    window.location.href = url.pathname + url.search;
  };

  return (
    <select
      value={currentSort}
      onChange={handleChange}
      className="w-full sm:w-auto bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-xs text-zinc-800 font-medium focus:outline-none focus:border-amber-700 cursor-pointer"
    >
      <option value="default">Featured / Default</option>
      <option value="price-low">Price: Low to High</option>
      <option value="price-high">Price: High to Low</option>
      <option value="name">Product Name (A-Z)</option>
    </select>
  );
}

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Search, X, Loader2, ArrowRight, Image as ImageIcon } from 'lucide-react';

interface SearchProductItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price?: number;
  image?: string | null;
  category?: { id: string; name: string; slug: string } | null;
}

export default function SearchBar() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
      setSuggestions([]);
      setActiveIndex(-1);
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch live suggestions
  const fetchSuggestions = useCallback(async (searchTerm: string) => {
    const clean = searchTerm.trim();
    if (clean.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(clean)}&limit=6`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.products || []);
      } else {
        setSuggestions([]);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce user input (250ms)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setActiveIndex(-1);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length >= 2) {
      setIsLoading(true);
      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions(val);
      }, 250);
    } else {
      setSuggestions([]);
      setIsLoading(false);
    }
  };

  // Submit search query to /search?q=...
  const handleSearchSubmit = (searchTerm?: string) => {
    const targetQuery = (searchTerm !== undefined ? searchTerm : query).trim();
    if (!targetQuery) return;
    setIsOpen(false);
    router.push(`/search?q=${encodeURIComponent(targetQuery)}`);
  };

  // Keyboard navigation (ArrowDown, ArrowUp, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > -1 ? prev - 1 : -1));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        const selected = suggestions[activeIndex];
        setIsOpen(false);
        router.push(`/product/${selected.slug}`);
      } else {
        handleSearchSubmit();
      }
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Search Toggle Icon */}
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 text-zinc-700 hover:text-amber-800 transition-colors flex items-center justify-center rounded-full hover:bg-zinc-50"
          aria-label="Search products"
          title="Search products"
        >
          <Search className="w-5 h-5 stroke-[1.75]" />
        </button>
      ) : (
        /* Active Search Bar */
        <div className="flex items-center">
          {/* Desktop & Mobile Input Container */}
          <div className="fixed inset-x-0 top-0 sm:static sm:inset-auto z-50 bg-white sm:bg-transparent px-4 py-3 sm:p-0 shadow-md sm:shadow-none border-b sm:border-0 border-zinc-200 flex items-center gap-2">
            <div className="relative flex-1 sm:w-72 md:w-80 flex items-center">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Search sacred art, posters, frames..."
                className="w-full pl-9 pr-8 py-2 text-xs text-zinc-900 bg-zinc-50 sm:bg-white border border-zinc-300 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800 transition-all placeholder:text-zinc-400"
              />
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 text-zinc-400 absolute right-3 animate-spin pointer-events-none" />
              ) : query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setSuggestions([]);
                    inputRef.current?.focus();
                  }}
                  className="absolute right-3 text-zinc-400 hover:text-zinc-600 p-0.5"
                  aria-label="Clear query"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>

            {/* Close Search Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-zinc-500 hover:text-zinc-800 transition-colors rounded-full hover:bg-zinc-100"
              aria-label="Close search"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Suggestions Dropdown */}
          {query.trim().length >= 2 && (
            <div className="fixed inset-x-4 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 bg-white border border-zinc-200 rounded-2xl shadow-xl py-2 z-50 overflow-hidden max-h-[80vh] sm:max-h-[460px] flex flex-col">
              {suggestions.length > 0 ? (
                <div className="overflow-y-auto divide-y divide-zinc-50">
                  <div className="px-3 py-1.5 bg-zinc-50/70 border-b border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500 font-medium">
                    <span>Products</span>
                    <span>{suggestions.length} suggestion{suggestions.length > 1 ? 's' : ''}</span>
                  </div>

                  {suggestions.map((item, idx) => {
                    const isSelected = activeIndex === idx;
                    return (
                      <Link
                        key={item.id}
                        href={`/product/${item.slug}`}
                        onClick={() => setIsOpen(false)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`flex items-center gap-3 p-3 transition-colors ${
                          isSelected ? 'bg-amber-50/70' : 'hover:bg-zinc-50'
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="w-12 h-12 relative flex-shrink-0 bg-zinc-100 rounded-lg overflow-hidden border border-zinc-200/60 flex items-center justify-center">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-zinc-300" />
                          )}
                        </div>

                        {/* Title, Category & Price */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-zinc-900 truncate">
                            {item.name}
                          </p>
                          {item.category && (
                            <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">
                              {item.category.name}
                            </p>
                          )}
                          <p className="text-xs font-bold text-amber-800 mt-0.5">
                            ₹{item.price.toLocaleString('en-IN')}
                            {item.compare_at_price && item.compare_at_price > item.price && (
                              <span className="text-[10px] text-zinc-400 line-through font-normal ml-1.5">
                                ₹{item.compare_at_price.toLocaleString('en-IN')}
                              </span>
                            )}
                          </p>
                        </div>
                      </Link>
                    );
                  })}

                  {/* View All Results Button */}
                  <button
                    onClick={() => handleSearchSubmit()}
                    className="w-full px-4 py-3 bg-zinc-50 hover:bg-amber-50/80 text-left text-xs font-bold text-amber-900 flex items-center justify-between transition-colors border-t border-zinc-100"
                  >
                    <span>View all results for &ldquo;{query}&rdquo;</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : !isLoading ? (
                <div className="p-6 text-center space-y-2">
                  <p className="text-xs font-medium text-zinc-600">
                    No products found for &ldquo;{query}&rdquo;
                  </p>
                  <button
                    onClick={() => handleSearchSubmit()}
                    className="text-xs font-bold text-amber-800 hover:underline"
                  >
                    Search all catalog &rarr;
                  </button>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-zinc-400">
                  Searching products...
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

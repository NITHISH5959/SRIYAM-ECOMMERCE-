'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PlaceholderImage from '@/components/ui/PlaceholderImage';

interface ImageSliderProps {
  images: string[];
  productName: string;
  category?: string;
  /** Optional: allow external control of active index */
  initialIndex?: number;
  onIndexChange?: (idx: number) => void;
}

export default function ImageSlider({
  images,
  productName,
  category,
  initialIndex = 0,
  onIndexChange,
}: ImageSliderProps) {
  const validImages = images.filter((url) => url && url.trim() !== '');
  const hasImages = validImages.length > 0;
  const multiImage = validImages.length > 1;

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  // track the "direction" of slide so we can animate correctly
  const [isAnimating, setIsAnimating] = useState(false);
  // offset tracks visual position during transition: 0=center, -100=left, 100=right
  const [offset, setOffset] = useState(0);

  // Touch / swipe tracking
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const pointerStartX = useRef<number | null>(null);

  const animatingRef = useRef(false);

  const navigate = useCallback(
    (nextIdx: number, dir: 'left' | 'right') => {
      if (animatingRef.current || nextIdx === activeIndex) return;
      animatingRef.current = true;
      setIsAnimating(true);

      // Slide the current image out in the appropriate direction
      setOffset(dir === 'right' ? -100 : 100);

      setTimeout(() => {
        // Snap to the new image instantly (no transition) from the opposite side
        setOffset(dir === 'right' ? 100 : -100);
        setActiveIndex(nextIdx);
        onIndexChange?.(nextIdx);

        // Use rAF to ensure the dom has rendered with the new image at offset
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setOffset(0);
            setTimeout(() => {
              setIsAnimating(false);
              animatingRef.current = false;
            }, 380); // matches transition duration
          });
        });
      }, 350); // time for exit animation
    },
    [activeIndex, onIndexChange]
  );

  const goToPrev = useCallback(() => {
    const prev = activeIndex > 0 ? activeIndex - 1 : validImages.length - 1;
    navigate(prev, 'left');
  }, [activeIndex, validImages.length, navigate]);

  const goToNext = useCallback(() => {
    const next = activeIndex < validImages.length - 1 ? activeIndex + 1 : 0;
    navigate(next, 'right');
  }, [activeIndex, validImages.length, navigate]);

  const goToIndex = useCallback(
    (idx: number) => {
      if (idx === activeIndex) return;
      navigate(idx, idx > activeIndex ? 'right' : 'left');
    },
    [activeIndex, navigate]
  );

  // Keyboard navigation
  useEffect(() => {
    if (!multiImage) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [multiImage, goToPrev, goToNext]);

  // Touch / swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current || !multiImage) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) goToNext();
      else goToPrev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Preload adjacent images
  const prevIdx = activeIndex > 0 ? activeIndex - 1 : validImages.length - 1;
  const nextIdx = activeIndex < validImages.length - 1 ? activeIndex + 1 : 0;

  return (
    <div className="space-y-3">
      {/* ── Main Slider ──────────────────────────────────────────────────────── */}
      <div
        className="bg-zinc-50 border border-zinc-200 rounded-2xl overflow-hidden aspect-[4/5] relative select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        aria-label="Product image slider"
      >
        {hasImages ? (
          <div
            className="absolute inset-0 will-change-transform"
            style={{
              transform: `translateX(${offset}%)`,
              transition: isAnimating
                ? 'transform 360ms cubic-bezier(0.4, 0, 0.2, 1)'
                : 'none',
            }}
          >
            <Image
              src={validImages[activeIndex]}
              alt={`${productName} — image ${activeIndex + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, 58vw"
              className="object-cover"
              priority={activeIndex === 0}
              unoptimized={
                validImages[activeIndex].startsWith('blob:') ||
                validImages[activeIndex].startsWith('data:')
              }
            />
          </div>
        ) : (
          <PlaceholderImage
            title={productName}
            category={category || 'Sacred Art'}
            className="h-full"
          />
        )}

        {/* Hidden preload images for next/prev (invisible, lazy) */}
        {multiImage && hasImages && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={validImages[prevIdx]}
              alt=""
              aria-hidden
              className="sr-only"
              loading="lazy"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={validImages[nextIdx]}
              alt=""
              aria-hidden
              className="sr-only"
              loading="lazy"
            />
          </>
        )}

        {/* ── Arrow buttons ─────────────────────────────────────────────────── */}
        {multiImage && (
          <>
            <button
              onClick={goToPrev}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm border border-zinc-200/70 text-zinc-600 hover:bg-white hover:text-zinc-900 hover:border-zinc-300 flex items-center justify-center shadow-sm transition-all duration-150 active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToNext}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm border border-zinc-200/70 text-zinc-600 hover:bg-white hover:text-zinc-900 hover:border-zinc-300 flex items-center justify-center shadow-sm transition-all duration-150 active:scale-95"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* ── Dot indicators ────────────────────────────────────────────── */}
            <div
              className="absolute bottom-3.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5"
              role="tablist"
              aria-label="Image navigation"
            >
              {validImages.map((_, idx) => (
                <button
                  key={idx}
                  role="tab"
                  aria-selected={activeIndex === idx}
                  aria-label={`Go to image ${idx + 1}`}
                  onClick={() => goToIndex(idx)}
                  className={`rounded-full transition-all duration-300 ${
                    activeIndex === idx
                      ? 'w-5 h-1.5 bg-white shadow-sm'
                      : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/75'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Thumbnail strip ──────────────────────────────────────────────────── */}
      {multiImage && (
        <div
          className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-thin"
          role="tablist"
          aria-label="Image thumbnails"
        >
          {validImages.map((img, idx) => (
            <button
              key={idx}
              role="tab"
              aria-selected={activeIndex === idx}
              aria-label={`View image ${idx + 1}`}
              onClick={() => goToIndex(idx)}
              className={`flex-shrink-0 w-[72px] h-[90px] rounded-xl overflow-hidden border-2 transition-all duration-200 relative focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 ${
                activeIndex === idx
                  ? 'border-amber-700 ring-2 ring-amber-700/25 scale-[0.97]'
                  : 'border-zinc-200 hover:border-zinc-400 opacity-75 hover:opacity-100'
              }`}
            >
              <Image
                src={img}
                alt=""
                fill
                sizes="72px"
                className="object-cover"
                loading={idx === 0 ? 'eager' : 'lazy'}
                unoptimized={img.startsWith('blob:') || img.startsWith('data:')}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

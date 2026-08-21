import React from 'react';
import { Frame } from 'lucide-react';

interface PlaceholderImageProps {
  title?: string;
  category?: string;
  className?: string;
  aspectRatio?: string;
}

export default function PlaceholderImage({
  title = 'Sriyam Art',
  category,
  className = '',
}: PlaceholderImageProps) {
  return (
    <div
      className={`relative w-full h-full min-h-[220px] bg-gradient-to-br from-zinc-100 via-stone-50 to-amber-50/30 flex flex-col items-center justify-center p-6 text-center border border-zinc-200/60 rounded-lg overflow-hidden group select-none ${className}`}
    >
      {/* Decorative background grid pattern */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#18181b_1px,transparent_1px)] [background-size:16px_16px]" />

      <div className="relative z-10 flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-zinc-200/80 flex items-center justify-center text-amber-700 mb-3 transform transition-transform duration-300 group-hover:scale-110">
          <Frame className="w-6 h-6 stroke-[1.5]" />
        </div>

        {category && (
          <span className="text-[10px] font-medium tracking-widest text-amber-800/80 uppercase mb-1">
            {category}
          </span>
        )}

        <h4 className="text-xs font-semibold text-zinc-700 max-w-[160px] line-clamp-2 leading-snug">
          {title}
        </h4>

        <span className="text-[9px] text-zinc-400 mt-2 tracking-wider uppercase font-medium">
          Sriyam Sacred Collection
        </span>
      </div>
    </div>
  );
}

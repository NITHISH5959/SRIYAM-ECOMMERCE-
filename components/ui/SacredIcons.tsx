import React from 'react';

/**
 * Traditional Auspicious Deepam (Agal Vilakku / Sacred Diya Lamp).
 * Replaces generic AI sparkles with an authentic human Indian heritage motif.
 */
export function SacredDiyaIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      {/* Outer Flame Glow */}
      <path
        d="M12 2C12 2 9.5 5.5 9.5 8C9.5 9.5 10.5 10.8 12 11C13.5 10.8 14.5 9.5 14.5 8C14.5 5.5 12 2 12 2Z"
        className="text-amber-500"
        fill="currentColor"
      />
      {/* Inner Flame Core */}
      <path
        d="M12 4.8C12 4.8 10.8 6.6 10.8 7.8C10.8 8.6 11.3 9.1 12 9.2C12.7 9.1 13.2 8.6 13.2 7.8C13.2 6.6 12 4.8 12 4.8Z"
        className="text-amber-200"
        fill="currentColor"
      />
      {/* Brass Lamp Bowl */}
      <path
        d="M4.5 13C4.5 16.2 7.8 17.8 12 17.8C16.2 17.8 19.5 16.2 19.5 13C19.5 12.3 19 11.8 18 11.8C15.8 11.8 14.3 13.2 12 13.2C9.7 13.2 8.2 11.8 6 11.8C5 11.8 4.5 12.3 4.5 13Z"
        className="text-amber-700"
        fill="currentColor"
      />
      {/* Pedestal Stand */}
      <path
        d="M9.5 17.8H14.5V19.5H16.5V21H7.5V19.5H9.5V17.8Z"
        className="text-amber-800"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Handcrafted Sacred Art Frame icon.
 * Replaces the generic grid/hashtag icon (#) with a genuine picture frame & canvas.
 */
export function ArtFrameIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Outer wooden moulding */}
      <rect x="3" y="3" width="18" height="18" rx="2" />
      {/* Inner passe-partout mat */}
      <rect x="6.5" y="6.5" width="11" height="11" rx="1" />
      {/* Sun/Aura in artwork */}
      <circle cx="10" cy="10" r="1.3" fill="currentColor" stroke="none" />
      {/* Sacred mountain / temple hills in canvas */}
      <path d="M17.5 15.5l-3.5-3.5-4.5 4.5" />
    </svg>
  );
}

/**
 * South Indian Temple Gopuram / Vimanam architecture motif.
 */
export function TempleGopuramIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2v2M10.5 4h3" />
      <path d="M10 6h4l1 3H9l1-3z" />
      <path d="M8 9h8l1.5 4H6.5L8 9z" />
      <path d="M5 13h14v8H5v-8z" />
      <path d="M10 21v-5a2 2 0 0 1 4 0v5" />
    </svg>
  );
}

/**
 * Traditional Auspicious Lotus (Kamalam) Motif.
 */
export function LotusMotifIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 4c-1.6 2.6-3 5.5-3 8 0 2 1.3 3.5 3 3.5s3-1.5 3-3.5c0-2.5-1.4-5.4-3-8z" />
      <path d="M9 12c-2.5-.5-5.5.5-6.5 2.5 1.5 1.5 4 2 6.5 1" />
      <path d="M15 12c2.5-.5 5.5.5 6.5 2.5-1.5 1.5-4 2-6.5 1" />
      <path d="M7 16c-2 1-3.5 2.5-4 4.5 2.5.5 5-.5 7-2" />
      <path d="M17 16c2 1 3.5 2.5 4 4.5-2.5.5-5-.5-7-2" />
      <path d="M10 20.5c1 .5 3 .5 4 0" />
    </svg>
  );
}

/**
 * Artisan Heritage Seal Emblem.
 */
export function ArtisanSealIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="6" strokeDasharray="2 2" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

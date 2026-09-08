/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === 'development';

const nextConfig = {
  images: {
    remotePatterns: [
      {
        // Supabase storage buckets
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        // Supabase CDN
        protocol: 'https',
        hostname: '*.supabase.in',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // High quality image optimization — use 100 for logo, 85 for product images
    qualities: [100, 85, 75],
    // Serve WebP/AVIF for modern browsers for better performance
    formats: ['image/avif', 'image/webp'],
    // Increase minimum cache TTL to 1 week for static assets like the logo
    minimumCacheTTL: 604800,
  },

  async headers() {
    // 'unsafe-eval' is required for Next.js hot reload in dev but must NOT appear in production.
    const scriptSrc = isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com"
      : "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com";

    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Control referrer info sent with requests
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Enforce HTTPS for 1 year (enable once you have HTTPS confirmed)
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Restrict browser feature access
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com")',
          },
          // Content Security Policy
          // - Razorpay needs: checkout.razorpay.com (script + connect)
          // - Supabase needs: *.supabase.co (connect)
          // - Google Fonts needs: fonts.googleapis.com, fonts.gstatic.com
          // - Next.js Image optimization uses /_next/image (served from 'self')
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              scriptSrc,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              // 'self' covers /_next/image which Next.js uses for optimized local images
              "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://checkout.razorpay.com https://lh3.googleusercontent.com",
              "connect-src 'self' https://*.supabase.co https://*.supabase.in https://api.razorpay.com https://checkout.razorpay.com https://wa.me",
              "frame-src https://checkout.razorpay.com api.razorpay.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

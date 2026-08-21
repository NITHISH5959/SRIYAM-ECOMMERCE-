import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://sriyamstore.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/shop', '/product/'],
        disallow: [
          '/admin',
          '/admin/',
          '/checkout',
          '/checkout/',
          '/account',
          '/account/',
          '/api/',
          '/login',
          '/signup',
          '/order-success/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

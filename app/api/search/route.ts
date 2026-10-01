import { NextRequest, NextResponse } from 'next/server';
import { searchProducts } from '@/lib/data';
import { searchLimiter, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const { success, remaining } = searchLimiter.check(ip);

  if (!success) {
    return NextResponse.json(
      { error: 'Too many search requests. Please slow down.' },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Remaining': '0',
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || '').trim();
  const limitParam = parseInt(searchParams.get('limit') || '6', 10);
  const limit = Math.min(Math.max(1, isNaN(limitParam) ? 6 : limitParam), 24);

  if (!query || query.length < 2) {
    return NextResponse.json(
      { products: [] },
      {
        headers: {
          'X-RateLimit-Remaining': String(remaining),
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  }

  try {
    const products = await searchProducts(query, limit);

    // Return only the fields needed for search and suggestions
    const formatted = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      compare_at_price: p.compare_at_price,
      image: p.images && p.images.length > 0 ? p.images[0] : null,
      category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : null,
    }));

    return NextResponse.json(
      { products: formatted },
      {
        headers: {
          'X-RateLimit-Remaining': String(remaining),
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('[API /api/search error]', error);
    return NextResponse.json(
      { products: [] },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  }
}

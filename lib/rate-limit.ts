/**
 * Lightweight in-memory rate limiter for Next.js API routes.
 * Uses a sliding window counter keyed by IP address.
 * No external dependencies (Redis/Upstash) needed for initial production.
 *
 * Usage:
 *   const limiter = createRateLimiter({ limit: 10, windowMs: 60_000 });
 *   const { success, remaining } = limiter.check(ip);
 *   if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  /** Max requests allowed within the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export function createRateLimiter(options: RateLimitOptions) {
  const { limit, windowMs } = options;
  const store = new Map<string, RateLimitEntry>();

  // Periodically clean up expired entries to prevent memory leaks
  const cleanup = () => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) {
        store.delete(key);
      }
    }
  };
  // Run cleanup every 5 minutes
  if (typeof setInterval !== 'undefined') {
    setInterval(cleanup, 5 * 60 * 1000);
  }

  return {
    check(identifier: string): RateLimitResult {
      const now = Date.now();
      const existing = store.get(identifier);

      if (!existing || existing.resetAt < now) {
        // Start fresh window
        const entry: RateLimitEntry = { count: 1, resetAt: now + windowMs };
        store.set(identifier, entry);
        return { success: true, limit, remaining: limit - 1, resetAt: entry.resetAt };
      }

      existing.count += 1;

      if (existing.count > limit) {
        return { success: false, limit, remaining: 0, resetAt: existing.resetAt };
      }

      return {
        success: true,
        limit,
        remaining: limit - existing.count,
        resetAt: existing.resetAt,
      };
    },
  };
}

// Pre-configured limiters for each sensitive API surface
export const createOrderLimiter = createRateLimiter({ limit: 10, windowMs: 60_000 });
export const verifyPaymentLimiter = createRateLimiter({ limit: 5, windowMs: 60_000 });

/** Extract the real client IP from Next.js request headers */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

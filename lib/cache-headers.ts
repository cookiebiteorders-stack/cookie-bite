/**
 * Cache header utilities for API responses
 * Provides standardized cache control headers for different response types
 */

export type CacheDuration = 'short' | 'medium' | 'long' | 'static';

export interface CacheConfig {
  'Cache-Control': string;
  'CDN-Cache-Control'?: string;
}

const CACHE_DURATIONS: Record<CacheDuration, { maxAge: number; staleWhileRevalidate: number }> = {
  short: { maxAge: 60, staleWhileRevalidate: 300 }, // 1 min, 5 min stale
  medium: { maxAge: 300, staleWhileRevalidate: 600 }, // 5 min, 10 min stale
  long: { maxAge: 3600, staleWhileRevalidate: 86400 }, // 1 hour, 1 day stale
  static: { maxAge: 86400, staleWhileRevalidate: 604800 }, // 1 day, 1 week stale
};

/**
 * Get cache headers for public responses (CDN-cacheable)
 */
export function getPublicCacheHeaders(duration: CacheDuration = 'medium'): CacheConfig {
  const { maxAge, staleWhileRevalidate } = CACHE_DURATIONS[duration];
  return {
    'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
    'CDN-Cache-Control': `public, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
  };
}

/**
 * Get cache headers for private responses (user-specific, no CDN)
 */
export function getPrivateCacheHeaders(duration: CacheDuration = 'short'): CacheConfig {
  const { maxAge, staleWhileRevalidate } = CACHE_DURATIONS[duration];
  return {
    'Cache-Control': `private, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
  };
}

/**
 * Get no-cache headers for dynamic responses
 */
export function getNoCacheHeaders(): CacheConfig {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  };
}

/**
 * Apply cache headers to a NextResponse
 */
export function applyCacheHeaders(
  response: Response,
  headers: CacheConfig
): Response {
  const newResponse = new Response(response.body, response);
  Object.entries(headers).forEach(([key, value]) => {
    newResponse.headers.set(key, value);
  });
  return newResponse;
}

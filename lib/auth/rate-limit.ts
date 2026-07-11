/**
 * Rate limiting utilities for authentication endpoints
 * In-memory rate limiting with Redis fallback support
 */

import { AUTH_CONFIG } from "./config";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory rate limit store (for development/single-instance)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check if request is within rate limits
 */
export function checkRateLimit(
  identifier: string,
  type: keyof typeof AUTH_CONFIG.RATE_LIMITS
): { allowed: boolean; remaining: number; resetAt: number } {
  const config = AUTH_CONFIG.RATE_LIMITS[type];
  const now = Date.now();
  
  const entry = rateLimitStore.get(identifier);
  
  // No entry or expired, create new
  if (!entry || now > entry.resetAt) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(identifier, newEntry);
    
    return {
      allowed: true,
      remaining: config.max - 1,
      resetAt: newEntry.resetAt,
    };
  }
  
  // Entry exists and not expired
  if (entry.count >= config.max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }
  
  // Increment count
  entry.count += 1;
  rateLimitStore.set(identifier, entry);
  
  return {
    allowed: true,
    remaining: config.max - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Generate rate limit identifier from request
 */
export function getRateLimitIdentifier(
  type: 'sign-in' | 'sign-up' | 'password-reset' | 'oauth',
  identifier: string
): string {
  return `auth:${type}:${identifier}`;
}

/**
 * Clean up expired rate limit entries
 * Call this periodically to prevent memory leaks
 */
export function cleanupExpiredRateLimits(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Reset rate limit for a specific identifier (for testing/admin)
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Get rate limit status for a specific identifier
 */
export function getRateLimitStatus(
  identifier: string,
  type: keyof typeof AUTH_CONFIG.RATE_LIMITS
): { count: number; max: number; resetAt: number | null } {
  const config = AUTH_CONFIG.RATE_LIMITS[type];
  const entry = rateLimitStore.get(identifier);
  const now = Date.now();
  
  if (!entry || now > entry.resetAt) {
    return { count: 0, max: config.max, resetAt: null };
  }
  
  return {
    count: entry.count,
    max: config.max,
    resetAt: entry.resetAt,
  };
}

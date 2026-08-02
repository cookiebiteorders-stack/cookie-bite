/**
 * Redis-backed rate limiter for production environments.
 * Falls back to in-memory Map if Redis is not configured (for development).
 */

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  error?: string;
};

// In-memory fallback for development/testing
const memoryLimiter = new Map<string, { count: number; resetTime: number }>();

/**
 * Check rate limit using Redis if configured, otherwise falls back to in-memory Map.
 * 
 * @param key - Unique identifier for the rate limit (e.g., IP address, user ID)
 * @param maxRequests - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns Rate limit result with allowed status and metadata
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60 * 1000,
): Promise<RateLimitResult> {
  const now = Date.now();
  const resetTime = now + windowMs;

  // Check if Redis is configured
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn("[RateLimit] Redis not configured, using in-memory fallback");
    return checkInMemoryRateLimit(key, maxRequests, windowMs);
  }

  try {
    // Import ioredis client dynamically to avoid issues if not installed
    const { default: IORedis } = await import("ioredis");
    const client = new IORedis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      enableReadyCheck: true,
    });
    
    try {
      // Use Redis INCR with expiration for atomic rate limiting
      const redisKey = `ratelimit:${key}`;
      
      // Increment the counter
      const count = await client.incr(redisKey);
      
      // Set expiration on first request
      if (count === 1) {
        await client.pexpire(redisKey, windowMs);
      }
      
      const remaining = Math.max(0, maxRequests - count);
      const allowed = count <= maxRequests;
      
      return {
        allowed,
        remaining,
        resetTime,
      };
    } finally {
      await client.quit();
    }
  } catch (error) {
    console.error("[RateLimit] Redis error, falling back to in-memory:", error);
    return checkInMemoryRateLimit(key, maxRequests, windowMs);
  }
}

/**
 * In-memory rate limiter fallback (for development/testing).
 */
function checkInMemoryRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const resetTime = now + windowMs;
  
  const record = memoryLimiter.get(key);
  
  if (!record || now > record.resetTime) {
    memoryLimiter.set(key, { count: 1, resetTime });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime,
    };
  }
  
  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }
  
  record.count++;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * Clean up expired entries from in-memory limiter (call periodically).
 */
export function cleanupMemoryLimiter(): void {
  const now = Date.now();
  for (const [key, record] of memoryLimiter.entries()) {
    if (now > record.resetTime) {
      memoryLimiter.delete(key);
    }
  }
}

// Run cleanup every 5 minutes if using in-memory fallback
if (!process.env.REDIS_URL) {
  setInterval(cleanupMemoryLimiter, 5 * 60 * 1000);
}

import Redis from "ioredis";

let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;
  
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    if (process.env.NODE_ENV === "production") {
      // Hard-fail in production — missing REDIS_URL means rate limiting is
      // per-process only and breaks under PM2 cluster mode.
      console.error("[rate-limit] FATAL: REDIS_URL is not set in production. Cannot start without Redis-backed rate limiting.");
      throw new Error("REDIS_URL is not set in production");
    }
    console.warn("[rate-limit] REDIS_URL not set, falling back to in-memory rate limiting (dev/test only)");
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      enableReadyCheck: true,
    });

    redisClient.on("error", (err) => {
      console.error("[rate-limit] Redis error:", err.message);
    });

    return redisClient;
  } catch (err) {
    console.error("[rate-limit] Failed to initialize Redis:", err);
    return null;
  }
}

// Fallback in-memory rate limiter for when Redis is unavailable
const inMemoryBuckets = new Map<string, { count: number; reset: number }>();

function inMemoryRateOk(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = inMemoryBuckets.get(key);
  if (!entry || now > entry.reset) {
    inMemoryBuckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

// Probabilistic cleanup for in-memory fallback
function cleanupInMemory() {
  if (Math.random() < 0.001) {
    const now = Date.now();
    for (const [k, v] of inMemoryBuckets) {
      if (v.reset < now) inMemoryBuckets.delete(k);
    }
  }
}

export async function rateOk(key: string, max: number, windowMs: number): Promise<boolean> {
  const redis = getRedisClient();
  
  if (!redis) {
    cleanupInMemory();
    return inMemoryRateOk(key, max, windowMs);
  }

  try {
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.pexpire(key, windowMs);
    
    const results = await pipeline.exec();
    if (!results) return false;
    
    const count = results[0][1] as number;
    return count <= max;
  } catch (err) {
    console.error("[rate-limit] Redis operation failed, falling back to in-memory:", err);
    cleanupInMemory();
    return inMemoryRateOk(key, max, windowMs);
  }
}

export function closeRedis(): void {
  if (redisClient) {
    redisClient.quit();
    redisClient = null;
  }
}

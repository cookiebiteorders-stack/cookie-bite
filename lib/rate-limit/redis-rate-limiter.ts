import type Redis from "ioredis";

let redisClient: Redis | null = null;

async function getRedisClient(): Promise<Redis | null> {
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn("[rate-limit] REDIS_URL is not set, falling back to in-memory rate limiting");
    return null;
  }

  try {
    // dynamic import prevents bundling Node-only libs into Edge/worker runtimes
    const mod = await import("ioredis");
    const RedisImpl = (mod && (mod.default ?? mod)) as typeof Redis;

    // Initialize client
    // @ts-ignore - RedisImpl typing varies per runtime/import
    redisClient = new RedisImpl(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
      enableReadyCheck: true,
    });

    redisClient.on("error", (err: any) => {
      console.error("[rate-limit] Redis error:", err?.message ?? err);
    });

    return redisClient;
  } catch (err) {
    console.error("[rate-limit] Failed to dynamic-import or initialize Redis:", err);
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

/**
 * rateOk
 * - Async by design because Redis client may be dynamically imported/initialized.
 * - Falls back to in-memory limiter when Redis is unavailable or dynamic import fails.
 */
export async function rateOk(key: string, max: number, windowMs: number): Promise<boolean> {
  const redis = await getRedisClient();

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
    try {
      // quit may return a promise; ignore it to keep the signature simple
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      redisClient.quit?.();
    } catch (e) {
      console.error("[rate-limit] error while quitting redis:", e);
    }
    redisClient = null;
  }
}

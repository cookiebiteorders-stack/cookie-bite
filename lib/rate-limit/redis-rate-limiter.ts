let redisClient: any = null;

async function getRedisClient(): Promise<any> {
  if (redisClient) return redisClient;
  
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn("[rate-limit] REDIS_URL is not set, falling back to in-memory rate limiting");
    return null;
  }

  try {
    // Dynamic import to avoid edge runtime issues
    const { default: Redis } = await import("ioredis");
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      enableReadyCheck: true,
    });

    redisClient.on("error", (err: any) => {
      console.error("[rate-limit] Redis error:", err.message);
    });

    return redisClient;
  } catch (err: unknown) {
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
  } catch (err: unknown) {
    console.error("[rate-limit] Redis operation failed, falling back to in-memory:", err);
    cleanupInMemory();
    return inMemoryRateOk(key, max, windowMs);
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

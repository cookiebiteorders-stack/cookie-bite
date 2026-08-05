import { logError } from "@/lib/error-logger";

let redisClient: any = null;

// Circuit breaker state for Redis failures
type CircuitState = 'closed' | 'open' | 'half-open';
let circuitState: CircuitState = 'closed';
let failureCount = 0;
let lastFailureTime = 0;
const FAILURE_THRESHOLD = 5;
const RECOVERY_TIMEOUT_MS = 30_000; // 30 seconds

function isCircuitOpen(): boolean {
  if (circuitState === 'open') {
    const now = Date.now();
    if (now - lastFailureTime > RECOVERY_TIMEOUT_MS) {
      console.info("[rate-limit] Circuit breaker attempting recovery (half-open state)");
      circuitState = 'half-open';
      return false;
    }
    return true;
  }
  return false;
}

function recordFailure(): void {
  failureCount++;
  lastFailureTime = Date.now();
  
  if (failureCount >= FAILURE_THRESHOLD) {
    const error = new Error(`Circuit breaker opened after ${failureCount} failures`);
    logError(error, { failureCount, lastFailureTime }, 'high');
    console.error(`[rate-limit] Circuit breaker opened after ${failureCount} failures`);
    circuitState = 'open';
  }
}

function recordSuccess(): void {
  if (circuitState === 'half-open') {
    console.info("[rate-limit] Circuit breaker recovered (closed state)");
    circuitState = 'closed';
    failureCount = 0;
  } else if (circuitState === 'closed') {
    failureCount = Math.max(0, failureCount - 1);
  }
}

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
      recordFailure();
    });

    return redisClient;
  } catch (err: unknown) {
    console.error("[rate-limit] Failed to initialize Redis:", err);
    recordFailure();
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
  // Check circuit breaker first
  if (isCircuitOpen()) {
    console.warn("[rate-limit] Circuit breaker is open, using in-memory fallback");
    cleanupInMemory();
    return inMemoryRateOk(key, max, windowMs);
  }

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
    if (!results) {
      recordFailure();
      return false;
    }
    
    const count = results[0][1] as number;
    recordSuccess();
    return count <= max;
  } catch (err: unknown) {
    console.error("[rate-limit] Redis operation failed, falling back to in-memory:", err);
    recordFailure();
    cleanupInMemory();
    return inMemoryRateOk(key, max, windowMs);
  }
}

export function getCircuitState(): CircuitState {
  return circuitState;
}

export function resetCircuitBreaker(): void {
  console.info("[rate-limit] Circuit breaker manually reset");
  circuitState = 'closed';
  failureCount = 0;
  lastFailureTime = 0;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

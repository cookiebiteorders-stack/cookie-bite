import { getTrackingRedis } from "./redis";

interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetMs: number;
}

interface RateLimitOptions {
  /** Window length in ms (default 10s). */
  windowMs?: number;
  /** Max requests allowed in the window (default 60). */
  max?: number;
}

const inMemory = new Map<string, number[]>();

/**
 * Sliding-window rate limit keyed by `key`. Uses Redis when available
 * (production) and falls back to an in-memory map (dev/single-instance).
 */
export async function rateLimit(
  key: string,
  options: RateLimitOptions = {},
): Promise<RateLimitResult> {
  const windowMs = options.windowMs ?? 10_000;
  const max = options.max ?? 60;
  const now = Date.now();
  const redis = await getTrackingRedis();

  if (redis) {
    const redisKey = `tracking:rl:${key}`;
    try {
      const pipeline = redis.multi();
      pipeline.zremrangebyscore(redisKey, 0, now - windowMs);
      pipeline.zadd(redisKey, now, `${now}:${Math.random().toString(36).slice(2, 6)}`);
      pipeline.zcard(redisKey);
      pipeline.pexpire(redisKey, windowMs);
      const results = await pipeline.exec();
      const count = Number(results?.[2]?.[1] ?? 0);
      return {
        ok: count <= max,
        remaining: Math.max(0, max - count),
        resetMs: windowMs,
      };
    } catch (e) {
      console.warn("[rate-limit] redis fallback", e);
    }
  }

  const stamps = inMemory.get(key) ?? [];
  const fresh = stamps.filter((t) => now - t < windowMs);
  fresh.push(now);
  inMemory.set(key, fresh);
  return { ok: fresh.length <= max, remaining: Math.max(0, max - fresh.length), resetMs: windowMs };
}

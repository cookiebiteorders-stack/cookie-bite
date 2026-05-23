import type { Redis as RedisClient } from "ioredis";

/**
 * Lazy ioredis client shared across tracking routes.
 *
 * When `REDIS_URL` is missing we return `null` so callers can fall back to
 * PostgreSQL-only flows (rate limiting becomes a no-op, realtime users come
 * from the `tracking_realtime_users` table, etc.). This keeps the system
 * fully functional in dev/preview environments.
 */
let clientPromise: Promise<RedisClient | null> | null = null;

export function getTrackingRedis(): Promise<RedisClient | null> {
  if (clientPromise) return clientPromise;
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    clientPromise = Promise.resolve(null);
    return clientPromise;
  }
  clientPromise = (async () => {
    try {
      const { default: IORedis } = await import("ioredis");
      const client = new IORedis(url, {
        maxRetriesPerRequest: 2,
        enableReadyCheck: false,
        lazyConnect: false,
      });
      client.on("error", (err) => {
        console.warn("[tracking-redis] error", err.message);
      });
      return client;
    } catch (e) {
      console.warn("[tracking-redis] failed to load ioredis", e);
      return null;
    }
  })();
  return clientPromise;
}

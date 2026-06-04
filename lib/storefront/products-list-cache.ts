import "server-only";

import { createHash } from "node:crypto";
import { getTrackingRedis } from "@/lib/tracking-server/redis";

const KEY_PREFIX = "cb:products:list:";
const TTL_SECONDS = 60;

function cacheKeyFromSearchParams(params: URLSearchParams): string {
  const normalized = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  return createHash("sha256").update(normalized || "default").digest("hex").slice(0, 32);
}

export async function readProductsListCache(
  params: URLSearchParams,
): Promise<string | null> {
  const redis = await getTrackingRedis();
  if (!redis) return null;
  try {
    return await redis.get(`${KEY_PREFIX}${cacheKeyFromSearchParams(params)}`);
  } catch (e) {
    console.warn("[products-list-cache] read failed", e);
    return null;
  }
}

export async function writeProductsListCache(
  params: URLSearchParams,
  body: string,
): Promise<void> {
  const redis = await getTrackingRedis();
  if (!redis) return;
  try {
    await redis.setex(
      `${KEY_PREFIX}${cacheKeyFromSearchParams(params)}`,
      TTL_SECONDS,
      body,
    );
  } catch (e) {
    console.warn("[products-list-cache] write failed", e);
  }
}

/** Purge all product list keys after admin catalog changes. */
export async function invalidateProductsListCache(): Promise<void> {
  const redis = await getTrackingRedis();
  if (!redis) return;
  try {
    let cursor = "0";
    do {
      const [next, keys] = await redis.scan(cursor, "MATCH", `${KEY_PREFIX}*`, "COUNT", 64);
      cursor = next;
      if (keys.length) await redis.del(...keys);
    } while (cursor !== "0");
  } catch (e) {
    console.warn("[products-list-cache] invalidate failed", e);
  }
}

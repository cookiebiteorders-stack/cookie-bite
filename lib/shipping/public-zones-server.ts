import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeZone } from "@/lib/shipping/normalize-zone";
import {
  SHIPPING_ZONES_CACHE_TAG,
  type PublicShippingZone,
} from "@/lib/shipping/public-zones-shared";

const MEMORY_CACHE_TTL_MS = 30_000;
let cachedZones: PublicShippingZone[] | null = null;
let cacheExpiresAt = 0;

function toPublicZone(raw: unknown): PublicShippingZone {
  const zone = normalizeZone(raw);
  return {
    id: zone.id,
    name: zone.name,
    cities: zone.cities,
  };
}

function setMemoryCache(zones: PublicShippingZone[]) {
  cachedZones = zones;
  cacheExpiresAt = Date.now() + MEMORY_CACHE_TTL_MS;
}

export function invalidatePublicShippingZonesCache() {
  cachedZones = null;
  cacheExpiresAt = 0;
  try {
    revalidateTag(SHIPPING_ZONES_CACHE_TAG, "max");
  } catch {
    /* edge without cache */
  }
}

async function loadPublicShippingZonesFromDb(): Promise<PublicShippingZone[]> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("shipping_zones")
    .select("id, name, cities, is_active, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    const missing =
      error.code === "42P01" ||
      error.message.includes("shipping_zones") ||
      error.message.includes("does not exist");
    if (missing) return [];
    console.error("[shipping-zones] public read failed", error.message);
    return [];
  }

  return (data ?? []).map(toPublicZone);
}

const getCachedPublicShippingZonesFromDb = unstable_cache(
  loadPublicShippingZonesFromDb,
  ["store-shipping-zones-public"],
  { revalidate: 60, tags: [SHIPPING_ZONES_CACHE_TAG] },
);

export async function getPublicShippingZones(): Promise<PublicShippingZone[]> {
  if (cachedZones && Date.now() < cacheExpiresAt) {
    return cachedZones;
  }

  const zones = await getCachedPublicShippingZonesFromDb();
  setMemoryCache(zones);
  return zones;
}

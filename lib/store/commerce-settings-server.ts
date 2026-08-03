import "server-only";

import { invalidateAiWebsiteKnowledgeCache } from "@/lib/ai/website-knowledge";
import { revalidateTag, unstable_cache } from "next/cache";
import { createSupabaseAdminClient, tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  COMMERCE_SETTINGS_CACHE_TAG,
  DEFAULT_COMMERCE_SETTINGS,
  normalizeFreeShippingThreshold,
  pickPublicCommerceSettings,
  type PublicCommerceSettings,
  type StoreCommerceSettings,
} from "@/lib/store/commerce-settings-shared";

const MEMORY_CACHE_TTL_MS = 30_000;
let cachedSettings: StoreCommerceSettings | null = null;
let cacheExpiresAt = 0;

function normalizeRow(raw: unknown): StoreCommerceSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_COMMERCE_SETTINGS };
  const row = raw as Record<string, unknown>;
  return {
    id: typeof row.id === "string" ? row.id : "global",
    free_shipping_threshold_egp: normalizeFreeShippingThreshold(row.free_shipping_threshold_egp),
    updated_at:
      typeof row.updated_at === "string"
        ? row.updated_at
        : DEFAULT_COMMERCE_SETTINGS.updated_at,
  };
}

function setMemoryCache(settings: StoreCommerceSettings) {
  cachedSettings = settings;
  cacheExpiresAt = Date.now() + MEMORY_CACHE_TTL_MS;
}

export function invalidateCommerceSettingsCache() {
  cachedSettings = null;
  cacheExpiresAt = 0;
  try {
    revalidateTag(COMMERCE_SETTINGS_CACHE_TAG, "max");
  } catch (error) {
    console.error("===== COMMERCE SETTINGS CACHE INVALIDATION ERROR =====");
    console.error(error);
    console.error(error?.stack);
    // edge without cache - continue
  }
  invalidateAiWebsiteKnowledgeCache();
}

async function loadCommerceSettingsFromDb(): Promise<StoreCommerceSettings> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return { ...DEFAULT_COMMERCE_SETTINGS };

  const { data, error } = await supabase
    .from("store_commerce_settings")
    .select("id, free_shipping_threshold_egp, updated_at")
    .eq("id", "global")
    .maybeSingle();

  if (error) {
    const missing =
      error.code === "42P01" ||
      error.message.includes("store_commerce_settings") ||
      error.message.includes("does not exist");
    if (missing) return { ...DEFAULT_COMMERCE_SETTINGS };
    console.error("===== COMMERCE SETTINGS DB READ ERROR =====");
    console.error(error);
    console.error(error?.stack);
    return { ...DEFAULT_COMMERCE_SETTINGS };
  }

  return normalizeRow(data);
}

const getCachedCommerceSettingsFromDb = unstable_cache(
  loadCommerceSettingsFromDb,
  ["store-commerce-settings-global"],
  { revalidate: 60, tags: [COMMERCE_SETTINGS_CACHE_TAG] },
);

export async function getCommerceSettings(): Promise<StoreCommerceSettings> {
  if (cachedSettings && Date.now() < cacheExpiresAt) {
    return cachedSettings;
  }

  const settings = await getCachedCommerceSettingsFromDb();
  setMemoryCache(settings);
  return settings;
}

export async function getPublicCommerceSettings(): Promise<PublicCommerceSettings> {
  const settings = await getCommerceSettings();
  return pickPublicCommerceSettings(settings);
}

export async function getFreeShippingThresholdEgp(): Promise<number> {
  const settings = await getCommerceSettings();
  return settings.free_shipping_threshold_egp;
}

export async function updateCommerceSettings(
  patch: Partial<Pick<StoreCommerceSettings, "free_shipping_threshold_egp">>,
  updatedByUserId: string | null,
): Promise<StoreCommerceSettings> {
  const current = await getCommerceSettings();
  const next: StoreCommerceSettings = {
    ...current,
    free_shipping_threshold_egp:
      patch.free_shipping_threshold_egp != null
        ? normalizeFreeShippingThreshold(patch.free_shipping_threshold_egp)
        : current.free_shipping_threshold_egp,
    updated_at: new Date().toISOString(),
  };

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("store_commerce_settings")
    .upsert({
      id: "global",
      free_shipping_threshold_egp: next.free_shipping_threshold_egp,
      updated_at: next.updated_at,
      updated_by: updatedByUserId,
    })
    .select("id, free_shipping_threshold_egp, updated_at")
    .single();

  if (error) throw new Error(error.message);

  const saved = normalizeRow(data);
  invalidateCommerceSettingsCache();
  setMemoryCache(saved);
  return saved;
}

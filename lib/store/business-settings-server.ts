import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";
import { createSupabaseAdminClient, tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  BUSINESS_SETTINGS_CACHE_TAG,
  DEFAULT_BUSINESS_SETTINGS,
  pickPublicBusinessSettings,
  type PublicBusinessSettings,
  type StoreBusinessSettings,
} from "@/lib/store/business-settings-shared";

const MEMORY_CACHE_TTL_MS = 30_000;
let cachedSettings: StoreBusinessSettings | null = null;
let cacheExpiresAt = 0;

function normalizeRow(raw: unknown): StoreBusinessSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_BUSINESS_SETTINGS };
  const row = raw as Record<string, unknown>;
  return {
    id: typeof row.id === "string" ? row.id : "global",
    hours_en:
      typeof row.hours_en === "string" && row.hours_en.trim()
        ? row.hours_en.trim()
        : DEFAULT_BUSINESS_SETTINGS.hours_en,
    hours_ar:
      typeof row.hours_ar === "string" && row.hours_ar.trim()
        ? row.hours_ar.trim()
        : DEFAULT_BUSINESS_SETTINGS.hours_ar,
    updated_at:
      typeof row.updated_at === "string"
        ? row.updated_at
        : DEFAULT_BUSINESS_SETTINGS.updated_at,
  };
}

function setMemoryCache(settings: StoreBusinessSettings) {
  cachedSettings = settings;
  cacheExpiresAt = Date.now() + MEMORY_CACHE_TTL_MS;
}

export function invalidateBusinessSettingsCache() {
  cachedSettings = null;
  cacheExpiresAt = 0;
  try {
    revalidateTag(BUSINESS_SETTINGS_CACHE_TAG, "max");
  } catch (error) {
    console.error("===== BUSINESS SETTINGS CACHE INVALIDATION ERROR =====");
    console.error(error);
    console.error(error?.stack);
    // edge without cache - continue
  }
}

async function loadBusinessSettingsFromDb(): Promise<StoreBusinessSettings> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return { ...DEFAULT_BUSINESS_SETTINGS };

  const { data, error } = await supabase
    .from("store_business_settings")
    .select("id, hours_en, hours_ar, updated_at")
    .eq("id", "global")
    .maybeSingle();

  if (error) {
    const missing =
      error.code === "42P01" ||
      error.message.includes("store_business_settings") ||
      error.message.includes("does not exist");
    if (missing) return { ...DEFAULT_BUSINESS_SETTINGS };
    console.error("===== BUSINESS SETTINGS DB READ ERROR =====");
    console.error(error);
    console.error(error?.stack);
    return { ...DEFAULT_BUSINESS_SETTINGS };
  }

  return normalizeRow(data);
}

const getCachedBusinessSettingsFromDb = unstable_cache(
  loadBusinessSettingsFromDb,
  ["store-business-settings-global"],
  { revalidate: 60, tags: [BUSINESS_SETTINGS_CACHE_TAG] },
);

export async function getBusinessSettings(): Promise<StoreBusinessSettings> {
  if (cachedSettings && Date.now() < cacheExpiresAt) {
    return cachedSettings;
  }

  const settings = await getCachedBusinessSettingsFromDb();
  setMemoryCache(settings);
  return settings;
}

export async function getPublicBusinessSettings(): Promise<PublicBusinessSettings> {
  const settings = await getBusinessSettings();
  return pickPublicBusinessSettings(settings);
}

export async function updateBusinessSettings(
  patch: Partial<Pick<StoreBusinessSettings, "hours_en" | "hours_ar">>,
  updatedByUserId: string | null,
): Promise<StoreBusinessSettings> {
  const current = await getBusinessSettings();
  const next: StoreBusinessSettings = {
    ...current,
    hours_en:
      typeof patch.hours_en === "string" && patch.hours_en.trim()
        ? patch.hours_en.trim()
        : current.hours_en,
    hours_ar:
      typeof patch.hours_ar === "string" && patch.hours_ar.trim()
        ? patch.hours_ar.trim()
        : current.hours_ar,
    updated_at: new Date().toISOString(),
  };

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("store_business_settings")
    .upsert({
      id: "global",
      hours_en: next.hours_en,
      hours_ar: next.hours_ar,
      updated_at: next.updated_at,
      updated_by: updatedByUserId,
    })
    .select("id, hours_en, hours_ar, updated_at")
    .single();

  if (error) throw new Error(error.message);

  const saved = normalizeRow(data);
  invalidateBusinessSettingsCache();
  setMemoryCache(saved);
  return saved;
}

import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";
import { createSupabaseAdminClient, tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_OWNER_FLAGS,
  OWNER_FLAGS_CACHE_TAG,
  OWNER_FLAG_KEYS,
  type OwnerFlagKey,
  type OwnerFlags,
  type PublicStoreFlags,
} from "@/lib/store/owner-flags-shared";

const MEMORY_CACHE_TTL_MS = 30_000;
let cachedFlags: OwnerFlags | null = null;
let cacheExpiresAt = 0;

function normalizeFlags(raw: unknown): OwnerFlags {
  const base = { ...DEFAULT_OWNER_FLAGS };
  if (!raw || typeof raw !== "object") return base;
  for (const key of OWNER_FLAG_KEYS) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === "boolean") base[key] = v;
  }
  return base;
}

function setMemoryCache(flags: OwnerFlags) {
  cachedFlags = flags;
  cacheExpiresAt = Date.now() + MEMORY_CACHE_TTL_MS;
}

export function invalidateOwnerFlagsCache() {
  cachedFlags = null;
  cacheExpiresAt = 0;
  try {
    revalidateTag(OWNER_FLAGS_CACHE_TAG, "max");
  } catch (error) {
    console.error("===== OWNER FLAGS CACHE INVALIDATION ERROR =====");
    console.error(error);
    console.error(error?.stack);
    // edge without cache - continue
  }
}

async function loadOwnerFlagsFromDb(): Promise<OwnerFlags> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return DEFAULT_OWNER_FLAGS;

  const { data, error } = await supabase
    .from("store_owner_flags")
    .select("flags")
    .eq("id", "global")
    .maybeSingle();

  if (error) {
    const missing =
      error.code === "42P01" ||
      error.message.includes("store_owner_flags") ||
      error.message.includes("does not exist");
    if (missing) return DEFAULT_OWNER_FLAGS;
    console.error("===== OWNER FLAGS DB READ ERROR =====");
    console.error(error);
    console.error(error?.stack);
    return DEFAULT_OWNER_FLAGS;
  }

  return normalizeFlags(data?.flags);
}

const getCachedOwnerFlagsFromDb = unstable_cache(
  loadOwnerFlagsFromDb,
  ["store-owner-flags-global"],
  { revalidate: 60, tags: [OWNER_FLAGS_CACHE_TAG] },
);

export async function getOwnerFlags(): Promise<OwnerFlags> {
  if (cachedFlags && Date.now() < cacheExpiresAt) {
    return cachedFlags;
  }

  const flags = await getCachedOwnerFlagsFromDb();
  setMemoryCache(flags);
  return flags;
}

export async function getPublicStoreFlags(): Promise<PublicStoreFlags> {
  const flags = await getOwnerFlags();
  return {
    high_contrast_mode: flags.high_contrast_mode,
    maintenance_mode: flags.maintenance_mode,
    beta_features: flags.beta_features,
  };
}

export async function isOwnerFlagEnabled(key: OwnerFlagKey): Promise<boolean> {
  const flags = await getOwnerFlags();
  return flags[key];
}

export async function isSmartRetriesEnabled(): Promise<boolean> {
  return isOwnerFlagEnabled("smart_retries");
}

export async function updateOwnerFlags(
  patch: Partial<OwnerFlags>,
  updatedByUserId: string | null,
): Promise<OwnerFlags> {
  const current = await getOwnerFlags();
  const next: OwnerFlags = { ...current };
  for (const key of OWNER_FLAG_KEYS) {
    if (typeof patch[key] === "boolean") next[key] = patch[key]!;
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("store_owner_flags").upsert({
    id: "global",
    flags: next,
    updated_at: new Date().toISOString(),
    updated_by: updatedByUserId,
  });

  if (error) {
    throw new Error(error.message);
  }

  invalidateOwnerFlagsCache();
  setMemoryCache(next);
  return next;
}

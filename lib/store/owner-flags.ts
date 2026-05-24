import { createSupabaseAdminClient, tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

export const OWNER_FLAG_KEYS = [
  "smart_retries",
  "high_contrast_mode",
  "maintenance_mode",
  "beta_features",
] as const;

export type OwnerFlagKey = (typeof OWNER_FLAG_KEYS)[number];
export type OwnerFlags = Record<OwnerFlagKey, boolean>;

export const DEFAULT_OWNER_FLAGS: OwnerFlags = {
  smart_retries: true,
  high_contrast_mode: false,
  maintenance_mode: false,
  beta_features: false,
};

/** Public subset for storefront + middleware. */
export type PublicStoreFlags = Pick<
  OwnerFlags,
  "high_contrast_mode" | "maintenance_mode" | "beta_features"
>;

export const OWNER_FLAG_LABELS: Record<
  OwnerFlagKey,
  { en: string; ar: string; description: { en: string; ar: string } }
> = {
  smart_retries: {
    en: "Smart retries",
    ar: "إعادة محاولة ذكية",
    description: {
      en: "Automatically retry failed transactional emails with backoff.",
      ar: "إعادة إرسال رسائل البريد الفاشلة تلقائياً بتأخير متزايد.",
    },
  },
  high_contrast_mode: {
    en: "High contrast mode",
    ar: "وضع التباين العالي",
    description: {
      en: "Stronger text and borders across the storefront for accessibility.",
      ar: "نصوص وحدود أوضح في واجهة المتجر لسهولة القراءة.",
    },
  },
  maintenance_mode: {
    en: "Maintenance mode",
    ar: "وضع الصيانة",
    description: {
      en: "Show a maintenance page to shoppers; admin and APIs stay available.",
      ar: "عرض صفحة صيانة للزوار مع بقاء لوحة الإدارة والـ API.",
    },
  },
  beta_features: {
    en: "Beta features",
    ar: "ميزات تجريبية",
    description: {
      en: "Enable in-progress storefront and admin experiments.",
      ar: "تفعيل تجارب الواجهة قيد التطوير.",
    },
  },
};

const CACHE_TTL_MS = 30_000;
let cachedFlags: OwnerFlags | null = null;
let cacheExpiresAt = 0;

function isOwnerFlagKey(key: string): key is OwnerFlagKey {
  return (OWNER_FLAG_KEYS as readonly string[]).includes(key);
}

function normalizeFlags(raw: unknown): OwnerFlags {
  const base = { ...DEFAULT_OWNER_FLAGS };
  if (!raw || typeof raw !== "object") return base;
  for (const key of OWNER_FLAG_KEYS) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === "boolean") base[key] = v;
  }
  return base;
}

function setCache(flags: OwnerFlags) {
  cachedFlags = flags;
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
}

export function invalidateOwnerFlagsCache() {
  cachedFlags = null;
  cacheExpiresAt = 0;
}

export async function getOwnerFlags(): Promise<OwnerFlags> {
  if (cachedFlags && Date.now() < cacheExpiresAt) {
    return cachedFlags;
  }

  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) {
    setCache(DEFAULT_OWNER_FLAGS);
    return DEFAULT_OWNER_FLAGS;
  }

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
    if (missing) {
      setCache(DEFAULT_OWNER_FLAGS);
      return DEFAULT_OWNER_FLAGS;
    }
    console.error("[owner-flags] read failed", error.message);
    setCache(DEFAULT_OWNER_FLAGS);
    return DEFAULT_OWNER_FLAGS;
  }

  const flags = normalizeFlags(data?.flags);
  setCache(flags);
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
  setCache(next);
  return next;
}

export function parseOwnerFlagsPatch(body: unknown): Partial<OwnerFlags> | null {
  if (!body || typeof body !== "object") return null;
  const patch: Partial<OwnerFlags> = {};

  if ("flags" in body && body.flags && typeof body.flags === "object") {
    for (const [key, value] of Object.entries(body.flags as Record<string, unknown>)) {
      if (isOwnerFlagKey(key) && typeof value === "boolean") {
        patch[key] = value;
      }
    }
    return Object.keys(patch).length ? patch : null;
  }

  for (const key of OWNER_FLAG_KEYS) {
    const value = (body as Record<string, unknown>)[key];
    if (typeof value === "boolean") patch[key] = value;
  }

  return Object.keys(patch).length ? patch : null;
}

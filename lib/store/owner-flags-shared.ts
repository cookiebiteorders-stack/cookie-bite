export const OWNER_FLAGS_CACHE_TAG = "store-owner-flags";

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

function isOwnerFlagKey(key: string): key is OwnerFlagKey {
  return (OWNER_FLAG_KEYS as readonly string[]).includes(key);
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

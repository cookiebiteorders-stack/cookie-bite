function numFromEnv(value: string | undefined, fallback: number): number {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Env fallback when DB row is missing (build / first deploy). */
export const ENV_FREE_SHIPPING_THRESHOLD_EGP = numFromEnv(
  process.env.NEXT_PUBLIC_FREE_DELIVERY_THRESHOLD_EGP,
  500,
);

export const COMMERCE_SETTINGS_CACHE_TAG = "store-commerce-settings";

export type StoreCommerceSettings = {
  id: string;
  free_shipping_threshold_egp: number;
  updated_at: string;
};

export type PublicCommerceSettings = Pick<
  StoreCommerceSettings,
  "free_shipping_threshold_egp"
>;

export const DEFAULT_COMMERCE_SETTINGS: StoreCommerceSettings = {
  id: "global",
  free_shipping_threshold_egp: ENV_FREE_SHIPPING_THRESHOLD_EGP,
  updated_at: new Date(0).toISOString(),
};

export function normalizeFreeShippingThreshold(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_COMMERCE_SETTINGS.free_shipping_threshold_egp;
  return Math.round(n);
}

export function pickPublicCommerceSettings(
  settings: StoreCommerceSettings,
): PublicCommerceSettings {
  return {
    free_shipping_threshold_egp: normalizeFreeShippingThreshold(
      settings.free_shipping_threshold_egp,
    ),
  };
}

/** Replace `{threshold}` in static copy with the live admin setting. */
export function interpolateFreeShippingThreshold(text: string, threshold: number): string {
  return text.replace(/\{threshold\}/g, String(threshold));
}

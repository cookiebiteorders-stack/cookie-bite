export const BUSINESS_SETTINGS_CACHE_TAG = "store-business-settings";

export type StoreBusinessSettings = {
  id: string;
  hours_en: string;
  hours_ar: string;
  updated_at: string;
};

export type PublicBusinessSettings = Pick<StoreBusinessSettings, "hours_en" | "hours_ar">;

export const DEFAULT_BUSINESS_SETTINGS: StoreBusinessSettings = {
  id: "global",
  hours_en: "Sun–Thu · 10am – 8pm",
  hours_ar: "الأحد–الخميس · 10ص – 8م",
  updated_at: new Date(0).toISOString(),
};

export function pickPublicBusinessSettings(
  settings: StoreBusinessSettings,
): PublicBusinessSettings {
  return {
    hours_en: settings.hours_en.trim() || DEFAULT_BUSINESS_SETTINGS.hours_en,
    hours_ar: settings.hours_ar.trim() || DEFAULT_BUSINESS_SETTINGS.hours_ar,
  };
}

export function businessHoursForLang(
  settings: PublicBusinessSettings,
  lang: "ar" | "en",
): string {
  return lang === "ar" ? settings.hours_ar : settings.hours_en;
}

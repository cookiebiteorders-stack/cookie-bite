import type { Lang } from "@/lib/i18n/translations";

export const SHIPPING_ZONES_CACHE_TAG = "store-shipping-zones";

export type PublicShippingZone = {
  id: string;
  name: string;
  cities: string[];
};

/** Fallback when no active zones exist in the database yet. */
export const FALLBACK_ZONE_LABELS: Record<Lang, string[]> = {
  en: [
    "Fifth Settlement",
    "Mivida",
    "Mountain View",
    "Hyde Park",
    "Katameya",
    "Madinaty",
    "Rehab",
  ],
  ar: [
    "التجمع الخامس",
    "ميفيدا",
    "ماونتن فيو",
    "هايد بارك",
    "كاتامية",
    "مدينتي",
    "الرحاب",
  ],
};

export function getZoneDisplayLabels(zones: PublicShippingZone[]): string[] {
  const labels: string[] = [];
  const seen = new Set<string>();

  for (const zone of zones) {
    const items = zone.cities.length > 0 ? zone.cities : [zone.name];
    for (const item of items) {
      const trimmed = item.trim();
      const key = trimmed.toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      labels.push(trimmed);
    }
  }

  return labels;
}

export function resolveZoneDisplayLabels(
  zones: PublicShippingZone[],
  lang: Lang,
): string[] {
  const labels = getZoneDisplayLabels(zones);
  return labels.length > 0 ? labels : [...FALLBACK_ZONE_LABELS[lang]];
}

function listSeparator(lang: Lang): string {
  return lang === "ar" ? "، " : ", ";
}

export function formatZoneList(labels: string[], lang: Lang): string {
  return labels.join(listSeparator(lang));
}

export function formatZonesCoverageBody(labels: string[], lang: Lang): string {
  const list = formatZoneList(labels, lang);
  if (lang === "ar") {
    return `نوصّل في ${list}، وكمبوندات أخرى. أكّد عنوانك على واتساب قبل طلبات الهدايا الكبيرة.`;
  }
  return `We deliver across ${list}, and many more compounds. Confirm your address on WhatsApp before large gift orders.`;
}

/** Grouped lines for help article «delivery areas» (zone name + cities). */
export function formatZonesGroupedLines(
  zones: PublicShippingZone[],
  lang: Lang,
): string[] {
  if (zones.length === 0) {
    return lang === "ar"
      ? [
          "القاهرة: مدينة نصر، المعادي، مصر الجديدة، التجمع الأول والخامس، الرحاب، مدينتي.",
        ]
      : [
          "Cairo: Nasr City, Maadi, Heliopolis, First and Fifth Settlement, Rehab, Madinaty.",
        ];
  }

  return zones.map((zone) => {
    const cities = zone.cities.length > 0 ? zone.cities : [zone.name];
    return `${zone.name}: ${formatZoneList(cities, lang)}.`;
  });
}

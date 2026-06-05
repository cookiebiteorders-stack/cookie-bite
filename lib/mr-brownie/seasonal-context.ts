import { resolveActiveSeason, type SeasonId } from "@/lib/seasonal/config";

export type SeasonalChatContext = {
  season_id: SeasonId;
  label_en: string;
  label_ar: string;
  sales_hooks: string[];
  proactive_offers: string[];
};

const SEASON_COPY: Record<
  Exclude<SeasonId, "default">,
  { label_en: string; label_ar: string; hooks_en: string[]; hooks_ar: string[] }
> = {
  ramadan: {
    label_en: "Ramadan",
    label_ar: "رمضان",
    hooks_en: [
      "Mention iftar gift boxes and family sharing packs when relevant.",
      "Suggest pre-order for peak delivery windows.",
    ],
    hooks_ar: [
      "اذكر صناديق إفطار وهدايا العائلة عند المناسب.",
      "اقترح الطلب المسبق في مواسم الذروة.",
    ],
  },
  "eid-fitr": {
    label_en: "Eid al-Fitr",
    label_ar: "عيد الفطر",
    hooks_en: [
      "Lead with celebratory gift boxes and premium assortments.",
      "Offer message card personalization via /gift-box/build.",
    ],
    hooks_ar: [
      "ابدأ بصناديق هدايا احتفالية وتشكيلات فاخرة.",
      "اقترح بطاقة رسالة عبر /gift-box/build.",
    ],
  },
  "eid-adha": {
    label_en: "Eid al-Adha",
    label_ar: "عيد الأضحى",
    hooks_en: [
      "Suggest generous sharing boxes for visits and hospitality.",
      "Highlight bestseller bundles for quick gifting.",
    ],
    hooks_ar: [
      "اقترح صناديق مشاركة للزيارات والضيافة.",
      "أبرز باقات الأكثر مبيعاً للهدايا السريعة.",
    ],
  },
};

export function buildSeasonalChatContext(
  locale: "ar" | "en" | "auto" = "auto",
  at: Date = new Date(),
): SeasonalChatContext {
  const season_id = resolveActiveSeason(at);
  const ar = locale !== "en";

  if (season_id === "default") {
    return {
      season_id,
      label_en: "Default",
      label_ar: "عادي",
      sales_hooks: [],
      proactive_offers: [],
    };
  }

  const copy = SEASON_COPY[season_id];
  return {
    season_id,
    label_en: copy.label_en,
    label_ar: copy.label_ar,
    sales_hooks: ar ? copy.hooks_ar : copy.hooks_en,
    proactive_offers: ar
      ? [`موسم ${copy.label_ar} — اذكر العروض الموسمية عند اقتراح الهدايا.`]
      : [`${copy.label_en} season — weave seasonal gifting into recommendations.`],
  };
}

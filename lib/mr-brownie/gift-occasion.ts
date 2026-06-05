export type GiftOccasion = {
  id: string;
  label_en: string;
  label_ar: string;
};

const OCCASION_KEYWORDS: Array<{ id: string; label_en: string; label_ar: string; words: string[] }> =
  [
    {
      id: "birthday",
      label_en: "a birthday",
      label_ar: "عيد ميلاد",
      words: ["birthday", "عيد ميلاد", "ميلاد", "born"],
    },
    {
      id: "wedding",
      label_en: "a wedding",
      label_ar: "زفاف",
      words: ["wedding", "زفاف", "فرح", "engagement", "خطوبة"],
    },
    {
      id: "graduation",
      label_en: "graduation",
      label_ar: "تخرج",
      words: ["graduation", "تخرج", "graduate"],
    },
    {
      id: "thank_you",
      label_en: "thank-you",
      label_ar: "شكر وتقدير",
      words: ["thank you", "thanks", "شكر", "تقدير", "gratitude"],
    },
    {
      id: "corporate",
      label_en: "corporate gifting",
      label_ar: "هدايا شركات",
      words: ["corporate", "company", "team", "شركة", "فريق", "موظف"],
    },
  ];

export function detectGiftOccasion(message: string): GiftOccasion | null {
  const text = message.trim().toLowerCase();
  if (!text) return null;

  for (const row of OCCASION_KEYWORDS) {
    if (row.words.some((w) => text.includes(w.toLowerCase()))) {
      return { id: row.id, label_en: row.label_en, label_ar: row.label_ar };
    }
  }
  return null;
}

export function giftOccasionHint(occasion: GiftOccasion | null, locale: "ar" | "en" | "auto"): string | null {
  if (!occasion) return null;
  const ar = locale !== "en";
  return ar
    ? `مناسبة مكتشفة: ${occasion.label_ar} — اقترح صندوق هدايا مناسب من CONTEXT.products.`
    : `Detected occasion: ${occasion.label_en} — suggest a fitting gift box from CONTEXT.products.`;
}

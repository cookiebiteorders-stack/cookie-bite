import type { Product } from "@/lib/data";
import type { ChatProductCard } from "@/lib/mr-brownie/personas";
import { isProductOutOfStock } from "@/lib/products/stock";
import type { CatalogProduct } from "@/lib/storefront/shop-catalog-client";

export type GiftGuideBudget = "under_300" | "mid" | "premium";
export type GiftGuideOccasion =
  | "birthday"
  | "wedding"
  | "thank_you"
  | "corporate"
  | "eid"
  | "general";
export type GiftGuideDietary = "none" | "nut_free";

export type GiftGuideAnswers = {
  budget: GiftGuideBudget;
  occasion: GiftGuideOccasion;
  dietary: GiftGuideDietary;
};

const BUDGET_RANGES: Record<GiftGuideBudget, { min: number; max: number }> = {
  under_300: { min: 0, max: 299 },
  mid: { min: 300, max: 599 },
  premium: { min: 600, max: 999_999 },
};

const GIFT_GUIDE_CHIP_KEYS = ["mrBrownieChat.suggestions.shop0"] as const;

/** هل النص يطلق مسار دليل الهدايا (مطابقة الترجمة الحالية). */
export function isGiftGuideChip(chip: string, shop0Label: string): boolean {
  const normalized = chip.trim().toLowerCase();
  const target = shop0Label.trim().toLowerCase();
  if (normalized === target) return true;
  return (
    normalized.includes("gift") ||
    normalized.includes("هدية") ||
    normalized.includes("🎁")
  ) && (normalized.includes("recommend") || normalized.includes("رشّح") || normalized.includes("رشح"));
}

export function giftGuideChipKeys(): readonly string[] {
  return GIFT_GUIDE_CHIP_KEYS;
}

function productToCard(p: Product): ChatProductCard {
  return {
    id: p.id,
    name: p.name,
    price_egp: p.price,
    shop_path: `/shop/${p.id}`,
    image_url: p.image || null,
    in_stock: !isProductOutOfStock(p.stock),
  };
}

function scoreProduct(p: CatalogProduct, answers: GiftGuideAnswers): number {
  const range = BUDGET_RANGES[answers.budget];
  let score = 0;

  if (!p.inStock && isProductOutOfStock(p.stock)) return -1000;

  if (p.price >= range.min && p.price <= range.max) score += 25;
  else if (p.price <= range.max * 1.15) score += 8;
  else score -= 15;

  const cat = (p.category ?? "").toLowerCase();
  const nameDesc = `${p.name} ${p.description}`.toLowerCase();

  if (answers.occasion === "corporate") {
    if (cat.includes("gift") || nameDesc.includes("corporate") || nameDesc.includes("شرك")) {
      score += 20;
    }
  } else if (answers.occasion === "eid") {
    if (nameDesc.includes("eid") || nameDesc.includes("عيد") || p.seasons?.includes("eid")) {
      score += 20;
    }
  } else if (answers.occasion === "wedding") {
    if (nameDesc.includes("wedding") || nameDesc.includes("زفاف")) score += 15;
  } else if (answers.occasion === "birthday") {
    if (nameDesc.includes("birthday") || nameDesc.includes("ميلاد")) score += 12;
  } else if (answers.occasion === "thank_you") {
    if (cat.includes("gift") || p.badges?.includes("bestseller")) score += 12;
  } else {
    if (cat.includes("gift")) score += 10;
  }

  if (answers.dietary === "nut_free") {
    const dietary = (p.dietary ?? []).map((d) => d.toLowerCase());
    if (dietary.some((d) => d.includes("nut") && d.includes("free"))) score += 30;
    else if (nameDesc.includes("nut-free") || nameDesc.includes("خالي من المكسرات")) score += 20;
  }

  if (p.badges?.includes("bestseller")) score += 8;
  if (p.badges?.includes("trending")) score += 4;
  if (p.badges?.includes("new")) score += 2;

  return score;
}

export function pickGiftGuideProducts(
  catalog: CatalogProduct[],
  answers: GiftGuideAnswers,
  limit = 3,
): ChatProductCard[] {
  const ranked = catalog
    .map((p) => ({ p, score: scoreProduct(p, answers) }))
    .filter((row) => row.score > -100)
    .sort((a, b) => b.score - a.score);

  const picked: CatalogProduct[] = [];
  const seen = new Set<string>();
  for (const { p } of ranked) {
    if (picked.length >= limit) break;
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    picked.push(p);
  }

  if (picked.length < limit) {
    for (const p of catalog) {
      if (picked.length >= limit) break;
      if (seen.has(p.id) || isProductOutOfStock(p.stock)) continue;
      seen.add(p.id);
      picked.push(p);
    }
  }

  return picked.map(productToCard);
}

export function buildGiftGuideSummary(
  answers: GiftGuideAnswers,
  locale: "ar" | "en",
): string {
  const ar = locale === "ar";
  const budgetLabel = ar
    ? answers.budget === "under_300"
      ? "أقل من 300 جنيه"
      : answers.budget === "mid"
        ? "300–600 جنيه"
        : "600+ جنيه"
    : answers.budget === "under_300"
      ? "under EGP 300"
      : answers.budget === "mid"
        ? "EGP 300–600"
        : "EGP 600+";

  const occasionLabels: Record<GiftGuideOccasion, { en: string; ar: string }> = {
    birthday: { en: "birthday", ar: "عيد ميلاد" },
    wedding: { en: "wedding", ar: "زفاف" },
    thank_you: { en: "thank-you", ar: "شكر وتقدير" },
    corporate: { en: "corporate", ar: "شركات" },
    eid: { en: "Eid", ar: "عيد" },
    general: { en: "any occasion", ar: "مناسبة عامة" },
  };

  const occ = occasionLabels[answers.occasion];
  const dietary =
    answers.dietary === "nut_free"
      ? ar
        ? " · خالي من المكسرات"
        : " · nut-free preferred"
      : "";

  return ar
    ? `دليل الهدايا: ميزانية ${budgetLabel} · مناسبة ${occ.ar}${dietary}`
    : `Gift guide: budget ${budgetLabel} · ${occ.en}${dietary}`;
}

export function buildGiftGuideReply(
  answers: GiftGuideAnswers,
  locale: "ar" | "en",
  count: number,
): string {
  const ar = locale === "ar";
  if (count === 0) {
    return ar
      ? "لم أجد مطابقات دقيقة الآن — جرّب المتجر أو اسألني بصياغة أخرى."
      : "I couldn't find close matches right now — browse the shop or rephrase your request.";
  }
  const occ = answers.occasion;
  const reason = ar
    ? occ === "corporate"
      ? "اخترنا صناديق وهدايا تناسب تقدير الفريق والعمل."
      : occ === "eid"
        ? "هذه الخيارات مناسبة للعيد والاحتفال العائلي."
        : occ === "birthday"
          ? "حلويات وهدايا تُهدى كثيراً في أعياد الميلاد."
          : "بناءً على إجاباتك، هذه أفضل 3 اقتراحات من قائمتنا الآن."
    : occ === "corporate"
      ? "These picks work well for team and client appreciation."
      : occ === "eid"
        ? "Great for Eid gatherings and family gifting."
        : occ === "birthday"
          ? "Popular birthday treats and gift-ready boxes."
          : "Based on your answers, here are my top 3 picks from our menu right now.";

  return ar
    ? `🎁 ${reason} اضغط على أي بطاقة للتفاصيل أو أضف للسلة.`
    : `🎁 ${reason} Tap a card for details or add to cart.`;
}

import type { Lang } from "@/lib/i18n/translations";
import type {
  MysteryBoxGenerateResult,
  MysteryBoxRule,
  MysteryBoxSelectionItem,
  MysteryCandidateProduct,
  MysteryOccasion,
} from "@/lib/mystery-box/types";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickBoxSize(totalItems: number): string {
  if (totalItems <= 6) return "small";
  if (totalItems <= 12) return "medium";
  return "large";
}

function matchesCategories(product: MysteryCandidateProduct, categories: string[]): boolean {
  if (!categories.length) return true;
  const cat = product.category.toLowerCase();
  return categories.some((c) => cat.includes(c.toLowerCase()) || c.toLowerCase().includes(cat));
}

function preferenceScore(product: MysteryCandidateProduct, preferences: string): number {
  const p = preferences.toLowerCase();
  if (!p.trim()) return 0;
  let score = 0;
  const name = `${product.name} ${product.nameAr}`.toLowerCase();
  const dietary = product.dietary.join(" ").toLowerCase();

  if (
    (p.includes("chocolate") || p.includes("شوكولات") || p.includes("شوكولا")) &&
    (name.includes("choc") || name.includes("شوك") || product.category.toLowerCase().includes("choc"))
  ) {
    score += 3;
  }
  if (
    (p.includes("nut") || p.includes("مكسر") || p.includes("لوز")) &&
    (name.includes("nut") || name.includes("almond") || name.includes("مكسر"))
  ) {
    score -= 4;
  }
  if ((p.includes("vegan") || p.includes("نباتي")) && dietary.includes("vegan")) {
    score += 2;
  }
  if ((p.includes("gluten") || p.includes("جلوتين")) && dietary.includes("gluten")) {
    score += 1;
  }
  return score;
}

function itemReason(
  occasion: MysteryOccasion,
  product: MysteryCandidateProduct,
  lang: Lang,
): string {
  const ar = lang === "ar";
  const byOccasion: Record<MysteryOccasion, { en: string; ar: string }> = {
    birthday: {
      en: "Perfect for a birthday celebration",
      ar: "مناسب لاحتفال عيد الميلاد",
    },
    ramadan: {
      en: "A thoughtful Ramadan treat",
      ar: "لمسة رمضانية مميزة",
    },
    thanks: {
      en: "A sweet way to say thank you",
      ar: "هدية شكر لذيذة",
    },
    corporate: {
      en: "Professional gift-box pick",
      ar: "اختيار أنيق للشركات",
    },
    wedding: {
      en: "Celebration-worthy flavor",
      ar: "نكهة تليق بالاحتفال",
    },
  };
  const base = byOccasion[occasion][ar ? "ar" : "en"];
  if (product.category.toLowerCase().includes("choc")) {
    return ar ? `${base} — شوكولاتة` : `${base} — chocolate`;
  }
  return base;
}

export function generateMysteryBoxSelection(input: {
  rule: MysteryBoxRule;
  occasion: MysteryOccasion;
  budget: number;
  preferences?: string;
  products: MysteryCandidateProduct[];
  lang?: Lang;
}): MysteryBoxGenerateResult | null {
  const lang = input.lang ?? "en";
  const maxUnit = input.budget * 0.4;
  const prefs = input.preferences?.trim() ?? "";

  let pool = input.products.filter(
    (p) => p.price <= maxUnit && matchesCategories(p, input.rule.product_categories),
  );

  if (prefs && (prefs.includes("nut") || prefs.includes("مكسر"))) {
    pool = pool.filter(
      (p) =>
        !`${p.name} ${p.nameAr}`.toLowerCase().match(/nut|almond|pecan|مكسر|لوز|فستق/),
    );
  }

  if (!pool.length) return null;

  pool = shuffle(
    pool.sort((a, b) => preferenceScore(b, prefs) - preferenceScore(a, prefs)),
  );

  const selected: MysteryBoxSelectionItem[] = [];
  let totalPrice = 0;
  let totalItems = 0;
  const used = new Map<string, number>();

  const targetMin = input.budget * 0.85;
  const targetMax = input.budget;

  for (const product of pool) {
    if (totalItems >= input.rule.max_items) break;
    const existingQty = used.get(product.id) ?? 0;
    const maxStock = product.stock ?? 3;
    const maxQtyForProduct = Math.min(3, maxStock);
    if (existingQty >= maxQtyForProduct) continue;

    const qty = 1;
    const lineTotal = product.price * qty;
    if (totalPrice + lineTotal > targetMax) continue;

    selected.push({
      productId: product.id,
      slug: product.slug,
      name: lang === "ar" ? product.nameAr : product.name,
      quantity: qty,
      unitPrice: product.price,
      lineTotal,
      reason: itemReason(input.occasion, product, lang),
      imageUrl: product.imageUrl,
    });
    used.set(product.id, existingQty + qty);
    totalPrice += lineTotal;
    totalItems += qty;
  }

  // Second pass: fill toward min_items / targetMin with cheapest fitting items
  if (totalItems < input.rule.min_items || totalPrice < targetMin) {
    const sortedCheap = [...pool].sort((a, b) => a.price - b.price);
    for (const product of sortedCheap) {
      if (totalItems >= input.rule.max_items) break;
      if (totalItems >= input.rule.min_items && totalPrice >= targetMin) break;
      const existingQty = used.get(product.id) ?? 0;
      const maxStock = product.stock ?? 3;
      if (existingQty >= Math.min(3, maxStock)) continue;
      const lineTotal = product.price;
      if (totalPrice + lineTotal > targetMax) continue;

      const existing = selected.find((s) => s.productId === product.id);
      if (existing) {
        existing.quantity += 1;
        existing.lineTotal += product.price;
      } else {
        selected.push({
          productId: product.id,
          slug: product.slug,
          name: lang === "ar" ? product.nameAr : product.name,
          quantity: 1,
          unitPrice: product.price,
          lineTotal: product.price,
          reason: itemReason(input.occasion, product, lang),
          imageUrl: product.imageUrl,
        });
      }
      used.set(product.id, existingQty + 1);
      totalPrice += product.price;
      totalItems += 1;
    }
  }

  if (totalItems < input.rule.min_items || totalPrice < targetMin * 0.7) {
    return null;
  }

  const description =
    lang === "ar"
      ? input.rule.description_ar ?? "صندوق مفاجأة مخصص لك"
      : input.rule.description_en ?? "Your curated mystery box";

  return {
    occasion: input.occasion,
    budget: input.budget,
    boxSize: pickBoxSize(totalItems),
    items: selected,
    totalPrice: Math.round(totalPrice),
    totalItems,
    description,
    ruleId: input.rule.id,
  };
}

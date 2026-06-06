import type { ShopBadgeFilter } from "@/lib/storefront/shop-filters";

export type ShopQuizPurpose = "self" | "gift" | "kids" | "corporate";
export type ShopQuizBudget = "under_300" | "mid" | "premium";
export type ShopQuizTaste = "classic" | "chocolate" | "gift_box" | "bestsellers";

export type ShopFilterQuizAnswers = {
  purpose: ShopQuizPurpose;
  budget: ShopQuizBudget;
  taste: ShopQuizTaste;
};

const BUDGET_RANGES: Record<ShopQuizBudget, { min: number; max: number }> = {
  under_300: { min: 0, max: 299 },
  mid: { min: 300, max: 599 },
  premium: { min: 600, max: 999_999 },
};

export type ShopFilterQuizResult = {
  cat: string;
  minPrice: number | null;
  maxPrice: number | null;
  onlyBest: boolean;
  badgeFilter: ShopBadgeFilter | "all";
  query: string;
};

function pickCategory(categories: string[], ...needles: string[]): string {
  const lower = categories.map((c) => ({ raw: c, norm: c.toLowerCase() }));
  for (const needle of needles) {
    const hit = lower.find((c) => c.norm.includes(needle.toLowerCase()));
    if (hit) return hit.raw;
  }
  return "All";
}

/** Map quiz answers → shop filter state. */
export function applyShopFilterQuiz(
  answers: ShopFilterQuizAnswers,
  categories: string[],
): ShopFilterQuizResult {
  const range = BUDGET_RANGES[answers.budget];
  let cat = "All";
  let query = "";
  let onlyBest = false;
  let badgeFilter: ShopBadgeFilter | "all" = "all";

  if (answers.purpose === "gift") {
    cat = pickCategory(categories, "gift", "box", "هد");
  } else if (answers.purpose === "kids") {
    query = "kids";
    cat = pickCategory(categories, "kids", "fun");
  } else if (answers.purpose === "corporate") {
    cat = pickCategory(categories, "corporate", "gift", "box");
    query = "corporate";
  }

  if (answers.taste === "bestsellers") {
    onlyBest = true;
    badgeFilter = "bestseller";
  } else if (answers.taste === "chocolate") {
    query = query ? `${query} chocolate` : "chocolate";
    cat = pickCategory(categories, "brownie", "chocolate", "classic");
    if (cat === "All") cat = "All";
  } else if (answers.taste === "gift_box") {
    cat = pickCategory(categories, "gift", "box");
  } else if (answers.taste === "classic") {
    cat = pickCategory(categories, "classic", "cookie");
  }

  return {
    cat,
    minPrice: range.min > 0 ? range.min : null,
    maxPrice: range.max < 999_999 ? range.max : null,
    onlyBest,
    badgeFilter,
    query: query.trim(),
  };
}

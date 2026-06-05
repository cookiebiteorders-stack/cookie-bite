import type { MysteryBoxRule, MysteryOccasion } from "@/lib/mystery-box/types";

export type MysteryBudgetTier = {
  amount: number;
  ruleId: string;
  minItems: number;
  maxItems: number;
  descriptionEn: string | null;
  descriptionAr: string | null;
  rangeLabel: string;
};

function roundBudget(n: number): number {
  if (n <= 300) return Math.round(n / 50) * 50;
  return Math.round(n / 100) * 100;
}

function tierAmount(rule: MysteryBoxRule): number {
  const mid = (rule.budget_min + rule.budget_max) / 2;
  const rounded = roundBudget(mid);
  if (rounded >= rule.budget_min && rounded <= rule.budget_max) return rounded;
  return roundBudget(rule.budget_max);
}

export function getBudgetTiersForOccasion(
  rules: MysteryBoxRule[],
  occasion: MysteryOccasion,
): MysteryBudgetTier[] {
  return rules
    .filter((r) => r.occasion === occasion)
    .sort((a, b) => a.budget_min - b.budget_min)
    .map((rule) => {
      const amount = tierAmount(rule);
      return {
        amount,
        ruleId: rule.id,
        minItems: rule.min_items,
        maxItems: rule.max_items,
        descriptionEn: rule.description_en,
        descriptionAr: rule.description_ar,
        rangeLabel: `${Math.round(rule.budget_min)}–${Math.round(rule.budget_max)}`,
      };
    });
}

export function getOccasionsFromRules(rules: MysteryBoxRule[]): MysteryOccasion[] {
  const order: MysteryOccasion[] = [
    "birthday",
    "ramadan",
    "thanks",
    "corporate",
    "wedding",
  ];
  const present = new Set(
    rules.map((r) => r.occasion).filter((o): o is MysteryOccasion =>
      order.includes(o as MysteryOccasion),
    ),
  );
  return order.filter((o) => present.has(o));
}

/** Fallback when DB rules are unavailable (matches migration 0043). */
export const FALLBACK_MYSTERY_RULES: MysteryBoxRule[] = [
  {
    id: "fallback-birthday-s",
    occasion: "birthday",
    budget_min: 300,
    budget_max: 550,
    product_categories: [],
    min_items: 4,
    max_items: 6,
    description_ar: "تشكيلة احتفالية مميزة لعيد الميلاد",
    description_en: "A festive birthday cookie mix",
  },
  {
    id: "fallback-birthday-l",
    occasion: "birthday",
    budget_min: 550,
    budget_max: 1000,
    product_categories: [],
    min_items: 6,
    max_items: 10,
    description_ar: "صندوق فاخر لعيد الميلاد",
    description_en: "Premium birthday gift box",
  },
  {
    id: "fallback-ramadan",
    occasion: "ramadan",
    budget_min: 400,
    budget_max: 900,
    product_categories: [],
    min_items: 5,
    max_items: 8,
    description_ar: "تشكيلة رمضانية بنكهات خاصة",
    description_en: "Ramadan treats selection",
  },
  {
    id: "fallback-thanks",
    occasion: "thanks",
    budget_min: 250,
    budget_max: 500,
    product_categories: [],
    min_items: 3,
    max_items: 5,
    description_ar: "هدية شكر أنيقة",
    description_en: "Elegant thank-you gift",
  },
  {
    id: "fallback-corporate",
    occasion: "corporate",
    budget_min: 900,
    budget_max: 2000,
    product_categories: [],
    min_items: 8,
    max_items: 15,
    description_ar: "صندوق هدايا للشركات",
    description_en: "Corporate gifting box",
  },
  {
    id: "fallback-wedding",
    occasion: "wedding",
    budget_min: 600,
    budget_max: 1500,
    product_categories: [],
    min_items: 6,
    max_items: 10,
    description_ar: "تشكيلة احتفال زواج",
    description_en: "Wedding celebration box",
  },
];

import type { BuilderProduct } from "@/lib/gift-box-builder/data";
import type { GiftBoxSizeConfig } from "@/lib/gift-box-builder/sizes";
import type { GiftBoxBuilderState } from "@/lib/gift-box-builder/types";
import { getBoxCapacity, trimItemsToCapacity } from "@/lib/gift-box-builder/utils";
import type { Lang } from "@/lib/i18n/translations";
import type { OccasionTemplate } from "@/lib/occasion-templates/types";

const TARGET_ITEMS_BY_BOX: Record<string, number> = {
  small: 4,
  medium: 6,
  large: 10,
};

function resolveBoxCode(
  template: OccasionTemplate,
  boxSizes: GiftBoxSizeConfig[],
): string {
  const preferred = template.suggested_box_code?.trim();
  if (preferred && boxSizes.some((b) => b.code === preferred)) {
    return preferred;
  }
  const medium = boxSizes.find((b) => b.code === "medium");
  return medium?.code ?? boxSizes[0]?.code ?? "medium";
}

function autoPickProducts(
  products: BuilderProduct[],
  targetCount: number,
  cap: number,
): Record<string, number> {
  const goal = Math.min(cap, Math.max(3, targetCount));
  const pool = [...products].sort(() => Math.random() - 0.5);
  const items: Record<string, number> = {};
  const usedCategories = new Set<string>();
  let total = 0;

  for (const p of pool) {
    if (total >= goal) break;
    if (items[p.id]) continue;
    if (p.availableQuantity != null && p.availableQuantity < 1) continue;
    items[p.id] = 1;
    usedCategories.add(p.category);
    total += 1;
  }

  if (total < goal) {
    for (const p of pool) {
      if (total >= goal) break;
      const current = items[p.id] ?? 0;
      const max = p.availableQuantity ?? 3;
      if (current >= max) continue;
      items[p.id] = current + 1;
      total += 1;
    }
  }

  return trimItemsToCapacity(items, cap);
}

function itemsFromTemplate(
  template: OccasionTemplate,
  products: BuilderProduct[],
  cap: number,
): Record<string, number> {
  const catalog = new Map(products.map((p) => [p.id, p]));
  const items: Record<string, number> = {};
  let total = 0;

  for (const ref of template.suggested_products) {
    const p = catalog.get(ref.product_id);
    if (!p) continue;
    const max = p.availableQuantity ?? 99;
    const qty = Math.min(ref.quantity, max, cap - total);
    if (qty < 1) continue;
    items[ref.product_id] = qty;
    total += qty;
    if (total >= cap) break;
  }

  if (total > 0) return trimItemsToCapacity(items, cap);

  const boxCode = template.suggested_box_code ?? "medium";
  const target = TARGET_ITEMS_BY_BOX[boxCode] ?? 6;
  return autoPickProducts(products, target, cap);
}

export function applyOccasionTemplateToState(
  template: OccasionTemplate,
  products: BuilderProduct[],
  boxSizes: GiftBoxSizeConfig[],
  lang: Lang,
): Partial<GiftBoxBuilderState> {
  const box = resolveBoxCode(template, boxSizes);
  const cap = getBoxCapacity(box, boxSizes) || 12;
  const items = itemsFromTemplate(template, products, cap);
  const message =
    lang === "ar"
      ? template.suggested_message_ar ?? template.suggested_message_en ?? ""
      : template.suggested_message_en ?? template.suggested_message_ar ?? "";

  return {
    box,
    occasion: template.occasion_type,
    items,
    msgText: message,
    cardDesign: template.card_design ?? template.occasion_type,
    ribbonColor: template.ribbon_color ?? "gold",
    wrapStyle: template.wrap_style ?? "kraft",
    currentStep: 2,
    activeFilter: "All",
  };
}

export function templateDisplayName(template: OccasionTemplate, lang: Lang): string {
  if (lang === "ar") return template.name_ar;
  return template.name_en?.trim() || template.name_ar;
}

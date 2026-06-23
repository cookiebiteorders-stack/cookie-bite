import type { Addon, CartSelectedAddon } from "@/lib/addons/types";

export type AddonSelectedMap = Record<string, Record<string, number>>;

/** مفتاح مستقر لمقارنة قوائم الإضافات دون الاعتماد على مرجع المصفوفة */
export function addonSelectionKey(addons: Addon[]): string {
  if (addons.length === 0) return "";
  return addons
    .map((addon) => {
      const opts = addon.options
        .map((o) => `${o.id}:${o.default_selected ? 1 : 0}`)
        .join(",");
      return `${addon.id}:${addon.required ? 1 : 0}:${opts}`;
    })
    .join("|");
}

export function buildInitialAddonSelection(
  addons: Addon[],
  opts?: { emptyOptional?: boolean },
): AddonSelectedMap {
  const out: AddonSelectedMap = {};
  for (const addon of addons) {
    if (opts?.emptyOptional && !addon.required) {
      out[addon.id] = {};
      continue;
    }
    const picked: Record<string, number> = {};
    for (const opt of addon.options) {
      if (opt.default_selected) picked[opt.id] = 1;
    }
    out[addon.id] = picked;
  }
  return out;
}

export function setSingleAddonChoice(
  selected: AddonSelectedMap,
  addonId: string,
  optionId: string,
): AddonSelectedMap {
  if (!optionId) return clearAddonSelection(selected, addonId);
  return { ...selected, [addonId]: { [optionId]: 1 } };
}

export function getSelectedOptionIdForAddon(
  selected: AddonSelectedMap,
  addonId: string,
): string {
  const map = selected[addonId] ?? {};
  return Object.entries(map).find(([, q]) => q > 0)?.[0] ?? "";
}

export function buildCartAddonsFromSelection(
  addons: Addon[],
  selected: AddonSelectedMap,
): CartSelectedAddon[] {
  return addons
    .map((addon) => {
      const map = selected[addon.id] ?? {};
      const options = addon.options
        .filter((opt) => (map[opt.id] ?? 0) > 0)
        .map((opt) => ({
          option_id: opt.id,
          quantity: map[opt.id]!,
          price_snapshot: Number(opt.price),
        }));
      return { addon_id: addon.id, options };
    })
    .filter((a) => a.options.length > 0);
}

export function computeAddonsTotalEgp(selectedAddons: CartSelectedAddon[]): number {
  return selectedAddons.reduce(
    (sum, addon) =>
      sum + addon.options.reduce((inner, opt) => inner + opt.price_snapshot * opt.quantity, 0),
    0,
  );
}

export function isAddonOptionInStock(opt: { stock?: number | null }): boolean {
  if (opt.stock == null) return true;
  return opt.stock > 0;
}

export function getAddonOptionMaxQty(
  opt: { stock?: number | null; quantity_limit?: number | null },
  fallback = 99,
): number {
  const limits: number[] = [];
  if (opt.quantity_limit != null && opt.quantity_limit > 0) limits.push(opt.quantity_limit);
  if (opt.stock != null && opt.stock >= 0) limits.push(opt.stock);
  if (limits.length === 0) return fallback;
  return Math.min(...limits);
}

export function validateAddonSelection(
  addons: Addon[],
  selected: AddonSelectedMap,
): string | null {
  for (const addon of addons) {
    const map = selected[addon.id] ?? {};
    const chosen = Object.values(map).filter((v) => v > 0).length;
    if (addon.required && chosen === 0) {
      return addon.name;
    }
    for (const option of addon.options) {
      const q = map[option.id] ?? 0;
      if (q > 0 && !isAddonOptionInStock(option)) {
        return option.name;
      }
      const maxQty = getAddonOptionMaxQty(option);
      if (q > maxQty) {
        return option.name;
      }
    }
  }
  return null;
}

export function toggleSingleAddonOption(
  selected: AddonSelectedMap,
  addonId: string,
  optionId: string,
): AddonSelectedMap {
  const map = selected[addonId] ?? {};
  if (map[optionId] === 1 && Object.keys(map).length === 1) {
    return { ...selected, [addonId]: {} };
  }
  return { ...selected, [addonId]: { [optionId]: 1 } };
}

export function toggleMultiAddonOption(
  selected: AddonSelectedMap,
  addonId: string,
  optionId: string,
  checked: boolean,
): AddonSelectedMap {
  const addonMap = { ...(selected[addonId] ?? {}) };
  if (checked) addonMap[optionId] = addonMap[optionId] || 1;
  else delete addonMap[optionId];
  return { ...selected, [addonId]: addonMap };
}

export function setAddonOptionQty(
  selected: AddonSelectedMap,
  addonId: string,
  optionId: string,
  qtyValue: number,
  limit?: number | null,
  stock?: number | null,
): AddonSelectedMap {
  const maxQty = getAddonOptionMaxQty({ quantity_limit: limit, stock });
  const safe = Math.max(0, Math.min(maxQty, qtyValue));
  const addonMap = { ...(selected[addonId] ?? {}) };
  if (safe === 0) delete addonMap[optionId];
  else addonMap[optionId] = safe;
  return { ...selected, [addonId]: addonMap };
}

export function clearAddonSelection(
  selected: AddonSelectedMap,
  addonId: string,
): AddonSelectedMap {
  return { ...selected, [addonId]: {} };
}

export function addonGroupHasSelection(
  selected: AddonSelectedMap,
  addonId: string,
): boolean {
  const map = selected[addonId] ?? {};
  return Object.values(map).some((v) => v > 0);
}

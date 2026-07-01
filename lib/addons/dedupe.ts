import type { Addon, AddonOption, CartSelectedAddon } from "@/lib/addons/types";

/** Unique IDs, first occurrence wins (order preserved). */
export function dedupeIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const id = raw.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** One row per add-on id; option rows deduped by option id. */
export function dedupeAddonOptions(options: AddonOption[]): AddonOption[] {
  const seen = new Set<string>();
  const out: AddonOption[] = [];
  for (const opt of options) {
    const id = opt.id?.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(opt);
  }
  return out;
}

/** دمج خيارات مع إعادة توليد id عند التعارض — للدمج بين تصنيفات. */
export function mergeAddonOptionsWithIdRemap(
  base: AddonOption[],
  incoming: AddonOption[],
): { options: AddonOption[]; optionIdMap: Map<string, string> } {
  const optionIdMap = new Map<string, string>();
  const seen = new Set(
    base.map((o) => o.id?.trim()).filter((id): id is string => Boolean(id)),
  );
  const merged = [...base];

  for (const opt of incoming) {
    const oldId = opt.id?.trim();
    let id = oldId || crypto.randomUUID();
    if (oldId && seen.has(oldId)) {
      id = crypto.randomUUID();
      optionIdMap.set(oldId, id);
    } else if (!oldId) {
      id = crypto.randomUUID();
    }
    seen.add(id);
    merged.push({ ...opt, id });
  }

  return { options: merged, optionIdMap };
}

export function dedupeAddons(addons: Addon[]): Addon[] {
  const seen = new Set<string>();
  const out: Addon[] = [];
  for (const addon of addons) {
    const id = addon.id?.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      ...addon,
      options: dedupeAddonOptions(Array.isArray(addon.options) ? addon.options : []),
    });
  }
  return out;
}

/** نفس الاسم مرتين (سجلات مكررة في الإدارة) — نعرض واحدة فقط */
export function dedupeAddonsByName(addons: Addon[]): Addon[] {
  const seen = new Set<string>();
  const out: Addon[] = [];
  for (const addon of dedupeAddons(addons)) {
    const key = addon.name.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(addon);
  }
  return out;
}

/** Merge duplicate add-on / option selections from cart or checkout payloads. */
export function dedupeCartSelectedAddons(selected: CartSelectedAddon[]): CartSelectedAddon[] {
  const byAddon = new Map<
    string,
    Map<string, { quantity: number; price_snapshot: number }>
  >();

  for (const row of selected) {
    const addonId = row.addon_id?.trim();
    if (!addonId) continue;
    const optMap = byAddon.get(addonId) ?? new Map();
    for (const opt of row.options ?? []) {
      const optionId = opt.option_id?.trim();
      if (!optionId) continue;
      const qty = Math.max(0, Number(opt.quantity) || 0);
      if (qty === 0) continue;
      const prev = optMap.get(optionId);
      if (prev) {
        optMap.set(optionId, {
          quantity: prev.quantity + qty,
          price_snapshot: Number(opt.price_snapshot) || prev.price_snapshot,
        });
      } else {
        optMap.set(optionId, {
          quantity: qty,
          price_snapshot: Number(opt.price_snapshot) || 0,
        });
      }
    }
    if (optMap.size > 0) byAddon.set(addonId, optMap);
  }

  return [...byAddon.entries()].map(([addon_id, optMap]) => ({
    addon_id,
    options: [...optMap.entries()].map(([option_id, v]) => ({
      option_id,
      quantity: v.quantity,
      price_snapshot: v.price_snapshot,
    })),
  }));
}

export function addonsFromProductAddonJoinRows(
  rows: Array<{ addons?: Addon | Addon[] | null }>,
): Addon[] {
  const raw: Addon[] = [];
  for (const row of rows) {
    const nested = row.addons;
    const addon = Array.isArray(nested) ? nested[0] : nested;
    if (!addon) continue;
    raw.push({
      ...addon,
      options: Array.isArray(addon.options) ? addon.options : [],
    });
  }
  return dedupeAddons(raw);
}

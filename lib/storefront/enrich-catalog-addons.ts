import "server-only";

import { dedupeAddons } from "@/lib/addons/dedupe";
import type { Addon } from "@/lib/addons/types";
import { enrichAddonsWithCategories } from "@/lib/db/addon-categories";
import { listAllAddons, listLinkedAddonIdsByProductIds } from "@/lib/db/addons";

export async function buildAddonsByProductId(
  productIds: string[],
): Promise<Map<string, Addon[]>> {
  if (productIds.length === 0) return new Map();
  const [linkMap, allAddons] = await Promise.all([
    listLinkedAddonIdsByProductIds(productIds),
    listAllAddons(),
  ]);
  const enriched = await enrichAddonsWithCategories(allAddons);
  const addonById = new Map(enriched.map((a) => [a.id, a]));
  const out = new Map<string, Addon[]>();
  for (const productId of productIds) {
    const ids = linkMap.get(productId) ?? [];
    const linked = dedupeAddons(
      ids.map((id) => addonById.get(id)).filter((a): a is Addon => Boolean(a)),
    );
    if (linked.length > 0) out.set(productId, linked);
  }
  return out;
}

export function attachLinkedAddonsToRows<T extends { id: string }>(
  rows: T[],
  byProduct: Map<string, Addon[]>,
): Array<T & { linked_addons: Addon[] }> {
  return rows.map((row) => ({
    ...row,
    linked_addons: byProduct.get(row.id) ?? [],
  }));
}

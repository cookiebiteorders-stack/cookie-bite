import { addonsFromProductAddonJoinRows, dedupeIds } from "@/lib/addons/dedupe";
import { createSupabaseAdminClient, tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Addon } from "@/lib/addons/types";

export async function listAllAddons(): Promise<Addon[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("addons")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("listAllAddons", error);
    return [];
  }
  return ((data as Addon[] | null) ?? []).map((addon) => ({
    ...addon,
    options: Array.isArray(addon.options) ? addon.options : [],
  }));
}

export async function listLinkedAddonsForProduct(productId: string): Promise<Addon[]> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("product_addons")
    .select("addon_id, addons(*)")
    .eq("product_id", productId);
  if (error) {
    console.error("listLinkedAddonsForProduct", error);
    return [];
  }
  const rows = (data ?? []) as Array<{ addons?: Addon | Addon[] | null }>;
  return addonsFromProductAddonJoinRows(rows);
}

export async function listLinkedAddonIdsByProductIds(productIds: string[]) {
  if (productIds.length === 0) return new Map<string, string[]>();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("product_addons")
    .select("product_id, addon_id")
    .in("product_id", productIds);
  if (error) {
    console.error("listLinkedAddonIdsByProductIds", error);
    return new Map<string, string[]>();
  }
  const out = new Map<string, string[]>();
  for (const row of (data ?? []) as Array<{ product_id: string; addon_id: string }>) {
    const list = out.get(row.product_id) ?? [];
    if (!list.includes(row.addon_id)) list.push(row.addon_id);
    out.set(row.product_id, list);
  }
  return out;
}

export async function replaceProductAddonLinks(productId: string, addonIds: string[]) {
  const supabase = createSupabaseAdminClient();
  const { error: deleteErr } = await supabase.from("product_addons").delete().eq("product_id", productId);
  if (deleteErr) {
    throw new Error("Failed to clear product add-ons");
  }
  const uniqueIds = dedupeIds(addonIds);
  if (uniqueIds.length === 0) return;
  const payload = uniqueIds.map((addon_id) => ({ product_id: productId, addon_id }));
  const { error: insertErr } = await supabase.from("product_addons").insert(payload);
  if (insertErr) {
    throw new Error("Failed to link product add-ons");
  }
}

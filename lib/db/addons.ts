import { addonsFromProductAddonJoinRows, dedupeIds } from "@/lib/addons/dedupe";
import { createSupabaseAdminClient, tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Addon } from "@/lib/addons/types";
import { enrichAddonsWithCategories } from "@/lib/db/addon-categories";

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
  const raw = ((data as Addon[] | null) ?? []).map((addon) => ({
    ...addon,
    options: Array.isArray(addon.options) ? addon.options : [],
  }));
  return enrichAddonsWithCategories(raw);
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
  const linked = addonsFromProductAddonJoinRows(rows);
  return enrichAddonsWithCategories(linked);
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

export async function linkAddonsToAllProducts(addonIds: string[]): Promise<{ linked: number; skipped: number; errors: string[] }> {
  const supabase = createSupabaseAdminClient();
  const uniqueIds = dedupeIds(addonIds);
  if (uniqueIds.length === 0) {
    return { linked: 0, skipped: 0, errors: ["No addon IDs provided"] };
  }

  // Get all active products
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id")
    .eq("is_active", true);

  if (productsError) {
    throw new Error(`Failed to load products: ${productsError.message}`);
  }

  if (!products || products.length === 0) {
    return { linked: 0, skipped: 0, errors: ["No active products found"] };
  }

  const errors: string[] = [];
  let linked = 0;
  let skipped = 0;

  for (const product of products) {
    const productId = String(product.id);
    
    try {
      // Check which add-ons are already linked to this product
      const { data: existingLinks, error: checkError } = await supabase
        .from("product_addons")
        .select("addon_id")
        .eq("product_id", productId);

      if (checkError) {
        errors.push(`Product ${productId}: Failed to check existing links`);
        continue;
      }

      const existingAddonIds = new Set((existingLinks ?? []).map((link) => String(link.addon_id)));
      const addonsToLink = uniqueIds.filter((id) => !existingAddonIds.has(id));

      if (addonsToLink.length === 0) {
        skipped++;
        continue;
      }

      // Link the new add-ons
      const payload = addonsToLink.map((addon_id) => ({ product_id: productId, addon_id }));
      const { error: insertError } = await supabase.from("product_addons").insert(payload);

      if (insertError) {
        errors.push(`Product ${productId}: Failed to link add-ons`);
        continue;
      }

      linked++;
    } catch (err) {
      errors.push(`Product ${productId}: Unexpected error`);
    }
  }

  return { linked, skipped, errors };
}

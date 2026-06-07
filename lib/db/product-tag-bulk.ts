import type { SupabaseClient } from "@supabase/supabase-js";

export type BulkTagMode = "add" | "remove" | "replace";

export async function bulkApplyProductTags(
  supabase: SupabaseClient,
  productIds: string[],
  tagIds: string[],
  mode: BulkTagMode,
): Promise<number> {
  const uniqueProducts = [...new Set(productIds.filter(Boolean))];
  const uniqueTags = [...new Set(tagIds.filter(Boolean))];
  if (uniqueProducts.length === 0) return 0;

  if (mode === "replace") {
    for (const productId of uniqueProducts) {
      await supabase.from("product_tag_links").delete().eq("product_id", productId);
      if (uniqueTags.length > 0) {
        await supabase.from("product_tag_links").insert(
          uniqueTags.map((tag_id) => ({ product_id: productId, tag_id })),
        );
      }
    }
    return uniqueProducts.length;
  }

  if (mode === "remove") {
    if (uniqueTags.length === 0) return 0;
    for (const productId of uniqueProducts) {
      await supabase
        .from("product_tag_links")
        .delete()
        .eq("product_id", productId)
        .in("tag_id", uniqueTags);
    }
    return uniqueProducts.length;
  }

  // add
  if (uniqueTags.length === 0) return 0;
  const { data: existing } = await supabase
    .from("product_tag_links")
    .select("product_id, tag_id")
    .in("product_id", uniqueProducts);

  const existingSet = new Set(
    (existing ?? []).map((r) => `${r.product_id}:${r.tag_id}`),
  );

  const inserts: Array<{ product_id: string; tag_id: string }> = [];
  for (const productId of uniqueProducts) {
    for (const tagId of uniqueTags) {
      const key = `${productId}:${tagId}`;
      if (!existingSet.has(key)) {
        inserts.push({ product_id: productId, tag_id: tagId });
      }
    }
  }

  if (inserts.length > 0) {
    const { error } = await supabase.from("product_tag_links").insert(inserts);
    if (error) throw error;
  }

  return uniqueProducts.length;
}

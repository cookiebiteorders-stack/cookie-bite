import type { SupabaseClient } from "@supabase/supabase-js";

export type ProductCategoryRow = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string | null;
  sort_order: number;
  is_active: boolean;
};

export type ProductTagRow = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string | null;
};

export type ProductVariantRow = {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  price_egp: number | null;
  compare_price_egp: number | null;
  stock: number;
  weight_grams: number | null;
  pieces_count: number | null;
  image_url: string | null;
  options: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
};

export type ProductVariantInput = {
  id?: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  price_egp?: number | null;
  compare_price_egp?: number | null;
  stock: number;
  weight_grams?: number | null;
  pieces_count?: number | null;
  image_url?: string | null;
  options?: Record<string, unknown>;
  sort_order?: number;
  is_active?: boolean;
};

export async function listProductCategories(
  supabase: SupabaseClient,
): Promise<ProductCategoryRow[]> {
  const { data, error } = await supabase
    .from("product_categories")
    .select("id, slug, name_en, name_ar, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProductCategoryRow[];
}

export async function listProductTags(supabase: SupabaseClient): Promise<ProductTagRow[]> {
  const { data, error } = await supabase
    .from("product_tags")
    .select("id, slug, name_en, name_ar")
    .order("name_en", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProductTagRow[];
}

export async function listLinkedTagIdsByProductId(
  supabase: SupabaseClient,
  productId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("product_tag_links")
    .select("tag_id")
    .eq("product_id", productId);
  if (error) throw error;
  return (data ?? []).map((r) => String(r.tag_id));
}

export async function replaceProductTagLinks(
  supabase: SupabaseClient,
  productId: string,
  tagIds: string[],
): Promise<void> {
  const unique = [...new Set(tagIds.filter(Boolean))];
  await supabase.from("product_tag_links").delete().eq("product_id", productId);
  if (unique.length === 0) return;
  const { error } = await supabase.from("product_tag_links").insert(
    unique.map((tag_id) => ({ product_id: productId, tag_id })),
  );
  if (error) throw error;
}

export async function listProductVariants(
  supabase: SupabaseClient,
  productId: string,
): Promise<ProductVariantRow[]> {
  const { data, error } = await supabase
    .from("product_variants")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProductVariantRow[];
}

/** أحجام نشطة لعدة منتجات دفعة واحدة (للكتالوج) مرتبة حسب sort_order. */
export async function listActiveVariantsByProductIds(
  supabase: SupabaseClient,
  productIds: string[],
): Promise<Map<string, ProductVariantRow[]>> {
  const out = new Map<string, ProductVariantRow[]>();
  if (productIds.length === 0) return out;
  const { data, error } = await supabase
    .from("product_variants")
    .select("*")
    .in("product_id", productIds)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("listActiveVariantsByProductIds", error);
    return out;
  }
  for (const row of (data ?? []) as ProductVariantRow[]) {
    const list = out.get(row.product_id) ?? [];
    list.push(row);
    out.set(row.product_id, list);
  }
  return out;
}

export async function replaceProductVariants(
  supabase: SupabaseClient,
  productId: string,
  variants: ProductVariantInput[],
): Promise<ProductVariantRow[]> {
  await supabase.from("product_variants").delete().eq("product_id", productId);
  if (variants.length === 0) return [];

  const rows = variants.map((v, index) => ({
    product_id: productId,
    name: v.name.trim(),
    sku: v.sku?.trim() || null,
    barcode: v.barcode?.trim() || null,
    price_egp: v.price_egp ?? null,
    compare_price_egp: v.compare_price_egp ?? null,
    stock: Math.max(0, Math.floor(v.stock)),
    weight_grams: v.weight_grams ?? null,
    pieces_count: v.pieces_count ?? null,
    image_url: v.image_url?.trim() || null,
    options: v.options ?? {},
    sort_order: v.sort_order ?? index,
    is_active: v.is_active ?? true,
  }));

  const { data, error } = await supabase.from("product_variants").insert(rows).select("*");
  if (error) throw error;
  return (data ?? []) as ProductVariantRow[];
}

export async function resolveCategoryIdByName(
  supabase: SupabaseClient,
  categoryName: string | null | undefined,
): Promise<string | null> {
  const name = categoryName?.trim();
  if (!name) return null;
  const { data: byEn } = await supabase
    .from("product_categories")
    .select("id")
    .ilike("name_en", name)
    .limit(1)
    .maybeSingle();
  if (byEn?.id) return String(byEn.id);
  const { data: byAr } = await supabase
    .from("product_categories")
    .select("id")
    .ilike("name_ar", name)
    .limit(1)
    .maybeSingle();
  return byAr?.id ? String(byAr.id) : null;
}

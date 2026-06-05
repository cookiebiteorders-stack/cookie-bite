import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ProductRow } from "@/lib/db/types";
import type { Product } from "@/lib/data";
import type { Lang } from "@/lib/i18n/translations";
import { productRowToStorefrontProduct } from "@/lib/storefront/map-product-row";
import type { CollectionSeoKey } from "@/lib/seo";

const FALLBACK_DESC = "Fresh handcrafted treats from Cookie Bite — New Cairo.";

/** Maps collection landing slug → product category filter (Supabase) */
export const COLLECTION_CATEGORY_MAP: Record<CollectionSeoKey, string[]> = {
  classic: ["Classic", "classic"],
  seasonal: ["Seasonal", "seasonal"],
  stuffed: ["Stuffed", "stuffed", "Chocolate Lovers"],
  gifts: ["Gifts", "Gift", "gifts", "Premium"],
};

export async function listProductsForCollection(
  slug: CollectionSeoKey,
  lang: Lang = "en",
): Promise<Product[]> {
  const categories = COLLECTION_CATEGORY_MAP[slug];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return [];
  }
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .in("category", categories)
      .limit(24);

    if (error || !data?.length) {
      const { data: fallback } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .limit(12);
      return ((fallback as ProductRow[] | null) ?? []).map((r) =>
        productRowToStorefrontProduct(r, FALLBACK_DESC, lang),
      );
    }

    return (data as ProductRow[]).map((r) =>
      productRowToStorefrontProduct(r, FALLBACK_DESC, lang),
    );
  } catch (e) {
    console.error("listProductsForCollection", e);
    return [];
  }
}

export function isValidCollectionSlug(slug: string): slug is CollectionSeoKey {
  return slug === "classic" || slug === "seasonal" || slug === "stuffed" || slug === "gifts";
}

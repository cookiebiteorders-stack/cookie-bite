import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProductRow } from "@/lib/db/types";
import type { Product } from "@/lib/data";
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

export async function listProductsForCollection(slug: CollectionSeoKey): Promise<Product[]> {
  const categories = COLLECTION_CATEGORY_MAP[slug];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return [];
  }
  try {
    const supabase = await createSupabaseServerClient();
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
        productRowToStorefrontProduct(r, FALLBACK_DESC),
      );
    }

    return (data as ProductRow[]).map((r) => productRowToStorefrontProduct(r, FALLBACK_DESC));
  } catch (e) {
    console.error("listProductsForCollection", e);
    return [];
  }
}

export function isValidCollectionSlug(slug: string): slug is CollectionSeoKey {
  return slug === "classic" || slug === "seasonal" || slug === "stuffed" || slug === "gifts";
}

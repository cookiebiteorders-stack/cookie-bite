import "server-only";

import { unstable_cache } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { STOREFRONT_CATALOG_TAG } from "@/lib/storefront/cached-catalog";
import type { ShopApiProduct } from "@/lib/storefront/shop-catalog-client";

const CATALOG_SELECT =
  "id, slug, name, title_en, title_ar, description_en, description_ar, price_egp, compare_price_egp, image_url, images, badges, category, is_active, stock, created_at";

async function loadActiveShopCatalog(): Promise<ShopApiProduct[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select(CATALOG_SELECT)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[shop-catalog-server]", error);
    return [];
  }
  return (data ?? []) as ShopApiProduct[];
}

/** كتالوج المتجر كاملاً — يُمرَّر للعميل لتجنّب waterfall `/api/products`. */
export function getCachedShopCatalog(): Promise<ShopApiProduct[]> {
  return unstable_cache(loadActiveShopCatalog, ["shop-catalog-all"], {
    revalidate: 120,
    tags: [STOREFRONT_CATALOG_TAG],
  })();
}

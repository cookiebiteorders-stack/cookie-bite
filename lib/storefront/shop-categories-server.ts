import "server-only";

import { unstable_cache } from "next/cache";
import { listProductCategories } from "@/lib/db/product-catalog";
import { STOREFRONT_CATALOG_TAG } from "@/lib/storefront/cached-catalog";
import type { ShopCategoryLabelRow } from "@/lib/storefront/localize-shop-category";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function loadShopCategoryLabels(): Promise<ShopCategoryLabelRow[]> {
  try {
    const supabase = createSupabaseAdminClient();
    const rows = await listProductCategories(supabase);
    return rows.map((row) => ({
      name_en: row.name_en,
      name_ar: row.name_ar,
    }));
  } catch (error) {
    console.error("[shop-categories-server]", error);
    return [];
  }
}

export function getCachedShopCategoryLabels(): Promise<ShopCategoryLabelRow[]> {
  return unstable_cache(loadShopCategoryLabels, ["shop-category-labels"], {
    revalidate: 300,
    tags: [STOREFRONT_CATALOG_TAG],
  })();
}

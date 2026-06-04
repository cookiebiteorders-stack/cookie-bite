import "server-only";

import { unstable_cache } from "next/cache";
import type { Lang } from "@/lib/i18n/translations";
import type { Product } from "@/lib/data";
import { getHomepageFeaturedProducts } from "@/lib/storefront/homepage-featured";
import { getTrendingRecommendations } from "@/lib/recommendations/fetch-recommendations";

export const STOREFRONT_CATALOG_TAG = "storefront-catalog";

/** Featured carousel — cached 5 min, invalidated on product writes. */
export function getCachedHomepageFeaturedProducts(
  limit = 12,
  lang: Lang = "en",
): Promise<Product[]> {
  return unstable_cache(
    () => getHomepageFeaturedProducts(limit, lang),
    ["homepage-featured", lang, String(limit)],
    { revalidate: 300, tags: [STOREFRONT_CATALOG_TAG] },
  )();
}

/** Shop sidebar / trending — cached 2 min. */
export function getCachedTrendingRecommendations(
  limit = 8,
  lang: Lang = "en",
): Promise<Product[]> {
  return unstable_cache(
    () => getTrendingRecommendations(limit, lang),
    ["trending-recommendations", lang, String(limit)],
    { revalidate: 120, tags: [STOREFRONT_CATALOG_TAG] },
  )();
}

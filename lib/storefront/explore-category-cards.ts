import "server-only";

import { unstable_cache } from "next/cache";
import { CATEGORY_CARDS } from "@/lib/data";
import type { Product } from "@/lib/data";
import type { Lang } from "@/lib/i18n/translations";
import { PRODUCT_PLACEHOLDER_IMAGE } from "@/lib/products/media";
import type { CollectionSeoKey } from "@/lib/seo";
import {
  getCachedHomepageFeaturedProducts,
  STOREFRONT_CATALOG_TAG,
} from "@/lib/storefront/cached-catalog";
import { listProductsForCollection } from "@/lib/storefront/collection-products";
import type { ExploreCategoryCard, ExploreCategoryKey } from "@/lib/storefront/explore-category-types";

const CARD_CONFIG: ReadonlyArray<{
  key: ExploreCategoryKey;
  collection: CollectionSeoKey | null;
}> = [
  { key: "classic", collection: "classic" },
  { key: "seasonal", collection: "seasonal" },
  { key: "gifts", collection: "gifts" },
  { key: "bites", collection: null },
];

function pickHeroImage(products: Product[], fallbackImage: string): string {
  const withImage = products.find(
    (p) => p.image?.trim() && p.image !== PRODUCT_PLACEHOLDER_IMAGE,
  );
  return withImage?.image ?? fallbackImage;
}

async function resolveExploreCardsUncached(lang: Lang): Promise<ExploreCategoryCard[]> {
  const [classic, seasonal, gifts, featured] = await Promise.all([
    listProductsForCollection("classic", lang),
    listProductsForCollection("seasonal", lang),
    listProductsForCollection("gifts", lang),
    getCachedHomepageFeaturedProducts(12, lang),
  ]);

  const productsByKey: Record<ExploreCategoryKey, Product[]> = {
    classic,
    seasonal,
    gifts,
    bites: featured,
  };

  return CARD_CONFIG.map((cfg, i) => {
    const staticCard = CATEGORY_CARDS[i];
    const products = productsByKey[cfg.key];
    return {
      key: cfg.key,
      href: staticCard.href,
      image: pickHeroImage(products, staticCard.image),
    };
  });
}

export function getExploreCategoryCards(lang: Lang): Promise<ExploreCategoryCard[]> {
  return unstable_cache(
    () => resolveExploreCardsUncached(lang),
    ["explore-category-cards", lang],
    { revalidate: 300, tags: [STOREFRONT_CATALOG_TAG] },
  )();
}

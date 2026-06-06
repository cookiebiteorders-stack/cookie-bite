import type { CatalogProduct } from "@/lib/storefront/shop-catalog-client";

export type ShopSortMode =
  | "newest"
  | "price_asc"
  | "price_desc"
  | "popular"
  | "best_match";
export type ShopBadgeFilter = "bestseller" | "new" | "trending";

export type ShopFilterParams = {
  cat: string;
  query: string;
  sort: ShopSortMode;
  onlyBest: boolean;
  badgeFilter: ShopBadgeFilter | "all";
  inStockOnly: boolean;
  minPrice: number | null;
  maxPrice: number | null;
  priceBounds: { min: number; max: number };
};

export type ShopFacetCounts = {
  categories: Record<string, number>;
  badges: Record<ShopBadgeFilter | "all", number>;
  bestSellers: number;
  inStock: number;
};

function isMinPriceFilterActive(
  minPrice: number | null,
  bounds: { min: number; max: number },
): boolean {
  return minPrice != null && Number.isFinite(minPrice) && minPrice > bounds.min;
}

function isMaxPriceFilterActive(
  maxPrice: number | null,
  bounds: { min: number; max: number },
): boolean {
  return maxPrice != null && Number.isFinite(maxPrice) && maxPrice < bounds.max;
}

type OmitFacet = "category" | "badge" | "onlyBest" | "inStock" | null;

function filterCatalog(
  catalog: CatalogProduct[],
  params: ShopFilterParams,
  omit: OmitFacet = null,
): CatalogProduct[] {
  let list = catalog;
  const q = params.query.trim().toLowerCase();

  if (omit !== "category" && params.cat !== "All") {
    list = list.filter((p) => p.category === params.cat);
  }
  if (q) {
    list = list.filter((p) => {
      const hay = `${p.name} ${p.description} ${p.category}`.toLowerCase();
      return hay.includes(q);
    });
  }
  if (omit !== "onlyBest" && params.onlyBest) {
    list = list.filter((p) => p.badges?.includes("bestseller"));
  }
  if (omit !== "badge" && params.badgeFilter !== "all") {
    const badge = params.badgeFilter;
    list = list.filter((p) => p.badges?.includes(badge));
  }
  if (omit !== "inStock" && params.inStockOnly) {
    list = list.filter((p) => p.inStock);
  }
  if (isMinPriceFilterActive(params.minPrice, params.priceBounds)) {
    list = list.filter((p) => p.price >= params.minPrice!);
  }
  if (isMaxPriceFilterActive(params.maxPrice, params.priceBounds)) {
    list = list.filter((p) => p.price <= params.maxPrice!);
  }

  if (params.sort === "price_asc") {
    list = [...list].sort((a, b) => a.price - b.price);
  } else if (params.sort === "price_desc") {
    list = [...list].sort((a, b) => b.price - a.price);
  }

  return list;
}

export function filterShopProducts(
  catalog: CatalogProduct[],
  params: ShopFilterParams,
): CatalogProduct[] {
  return filterCatalog(catalog, params);
}

export function computeShopFacetCounts(
  catalog: CatalogProduct[],
  params: ShopFilterParams,
  categories: string[],
): ShopFacetCounts {
  const forCategory = filterCatalog(catalog, params, "category");
  const forBadge = filterCatalog(catalog, params, "badge");
  const forBest = filterCatalog(catalog, params, "onlyBest");
  const forStock = filterCatalog(catalog, params, "inStock");

  const categoryCounts: Record<string, number> = {};
  for (const c of categories) {
    categoryCounts[c] =
      c === "All" ? forCategory.length : forCategory.filter((p) => p.category === c).length;
  }

  const badgeCounts: ShopFacetCounts["badges"] = {
    all: forBadge.length,
    bestseller: forBadge.filter((p) => p.badges?.includes("bestseller")).length,
    new: forBadge.filter((p) => p.badges?.includes("new")).length,
    trending: forBadge.filter((p) => p.badges?.includes("trending")).length,
  };

  return {
    categories: categoryCounts,
    badges: badgeCounts,
    bestSellers: forBest.filter((p) => p.badges?.includes("bestseller")).length,
    inStock: forStock.filter((p) => p.inStock).length,
  };
}

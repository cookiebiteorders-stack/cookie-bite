import type { CatalogProduct } from "@/lib/storefront/shop-catalog-client";

export type BestMatchSignals = {
  recentSlugs: string[];
  recentProductUuids: string[];
  cartProductUuids: string[];
  trendingSlugs: string[];
};

function buildBestMatchScores(
  catalog: CatalogProduct[],
  signals: BestMatchSignals,
): Map<string, number> {
  const recentSlugSet = new Set(signals.recentSlugs);
  const recentUuidSet = new Set(signals.recentProductUuids);
  const cartUuidSet = new Set(signals.cartProductUuids);
  const trendingRank = new Map(
    signals.trendingSlugs.map((slug, index) => [slug, signals.trendingSlugs.length - index]),
  );

  const recentCategories = new Set<string>();
  for (const p of catalog) {
    const seen =
      recentSlugSet.has(p.id) ||
      (p.productUuid != null && recentUuidSet.has(p.productUuid));
    if (seen && p.category) recentCategories.add(p.category);
  }

  const scores = new Map<string, number>();
  for (const p of catalog) {
    let score = 0;

    if (p.productUuid && cartUuidSet.has(p.productUuid)) score -= 120;
    if (recentSlugSet.has(p.id)) score -= 80;
    else if (p.productUuid && recentUuidSet.has(p.productUuid)) score -= 80;

    if (p.category && recentCategories.has(p.category)) score += 35;
    if (p.badges?.includes("bestseller")) score += 20;
    if (p.badges?.includes("trending")) score += 12;
    if (p.badges?.includes("new")) score += 6;
    if (p.inStock) score += 5;

    score += trendingRank.get(p.id) ?? 0;
    scores.set(p.id, score);
  }

  return scores;
}

export function sortByBestMatch(
  products: CatalogProduct[],
  signals: BestMatchSignals,
): CatalogProduct[] {
  const scores = buildBestMatchScores(products, signals);
  return [...products].sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0));
}

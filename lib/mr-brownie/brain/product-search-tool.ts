import type { AiCatalogProduct } from "@/lib/ai/website-knowledge";

/** أداة بحث داخلية (بدون Vector DB) — تغذي الـ LLM بأفضل تطابقات */
export function searchCatalogForQuery(
  query: string,
  products: AiCatalogProduct[],
  limit = 6,
): AiCatalogProduct[] {
  const q = query.trim().toLowerCase();
  if (!q || !products.length) return [];

  const tokens = q.split(/\s+/).filter((t) => t.length > 1);
  if (!tokens.length) return products.slice(0, limit);

  const scored = products.map((p) => {
    const hay = `${p.name} ${p.name_ar ?? ""} ${p.description} ${p.category}`.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (hay.includes(t)) score += 2;
    }
    if (p.badges?.includes("bestseller") || p.badges?.includes("featured")) score += 1;
    if (p.in_stock) score += 1;
    return { p, score };
  });

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p);
}

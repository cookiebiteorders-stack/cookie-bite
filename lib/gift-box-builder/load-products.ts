import { GIFT_BOX_BUILDER_DATA, type BuilderProduct } from "@/lib/gift-box-builder/data";

const CATEGORY_EMOJI: Record<string, string> = {
  Cookies: "🍪",
  Brownies: "🟫",
  Chocolates: "🍫",
  Drinks: "☕",
  "Add-ons": "🎁",
  Gifts: "🎁",
  Gift: "🎁",
};

function normalizeCategory(raw: string | null): string {
  const c = (raw ?? "").trim();
  if (GIFT_BOX_BUILDER_DATA.categories.includes(c as (typeof GIFT_BOX_BUILDER_DATA.categories)[number])) {
    return c;
  }
  const lower = c.toLowerCase();
  if (lower.includes("brown")) return "Brownies";
  if (lower.includes("choc") || lower.includes("truffle")) return "Chocolates";
  if (lower.includes("drink") || lower.includes("coffee") || lower.includes("tea")) return "Drinks";
  if (lower.includes("gift") || lower.includes("addon") || lower.includes("add-on")) return "Add-ons";
  return "Cookies";
}

type ApiProduct = {
  id: string;
  title_en?: string | null;
  name?: string | null;
  price_egp: number;
  category?: string | null;
  dietary?: string[] | null;
};

/** Merge live catalog when available; otherwise use static builder catalog. */
export async function loadBuilderProducts(): Promise<BuilderProduct[]> {
  try {
    const res = await fetch("/api/products?limit=48&sort=newest");
    if (!res.ok) return [...GIFT_BOX_BUILDER_DATA.products];
    const json = (await res.json()) as { products?: ApiProduct[] };
    const rows = json.products ?? [];
    if (rows.length === 0) return [...GIFT_BOX_BUILDER_DATA.products];

    return rows.map((p) => {
      const category = normalizeCategory(p.category ?? null);
      const tags: string[] = [];
      const dietary = p.dietary ?? [];
      if (dietary.some((d) => d.toLowerCase().includes("vegan"))) tags.push("vegan");
      if (dietary.some((d) => d.toLowerCase().includes("gluten"))) tags.push("gf");
      return {
        id: `live-${p.id}`,
        productUuid: p.id,
        name: p.title_en || p.name || "Treat",
        price: Number(p.price_egp) || 0,
        emoji: CATEGORY_EMOJI[category] ?? "🍪",
        category,
        tags,
      } satisfies BuilderProduct;
    });
  } catch {
    return [...GIFT_BOX_BUILDER_DATA.products];
  }
}

import type { BuilderProduct } from "@/lib/gift-box-builder/data";
import type { Lang } from "@/lib/i18n/translations";
import {
  normalizeProductImages,
  primaryImageFromProduct,
} from "@/lib/products/media";

const CATEGORY_EMOJI: Record<string, string> = {
  Cookies: "🍪",
  Brownies: "🟫",
  Chocolates: "🍫",
  Drinks: "☕",
  "Add-ons": "🎁",
  Gifts: "🎁",
  Gift: "🎁",
};

function displayCategory(raw: string | null | undefined): string {
  const c = (raw ?? "").trim();
  if (c) return c;
  return "Cookies";
}

function emojiForCategory(category: string): string {
  return CATEGORY_EMOJI[category] ?? "🍪";
}

type ApiProduct = {
  id: string;
  slug?: string | null;
  title_en?: string | null;
  title_ar?: string | null;
  name?: string | null;
  price_egp: number;
  category?: string | null;
  dietary?: string[] | null;
  image_url?: string | null;
  images?: unknown;
  stock?: number | null;
  is_active?: boolean;
};

function isAvailable(p: ApiProduct): boolean {
  if (p.is_active === false) return false;
  if (!p.slug?.trim()) return false;
  if (p.stock != null && p.stock <= 0) return false;
  return true;
}

function productName(p: ApiProduct, lang: Lang): string {
  if (lang === "ar") {
    return p.title_ar?.trim() || p.title_en?.trim() || p.name?.trim() || "منتج";
  }
  return p.title_en?.trim() || p.title_ar?.trim() || p.name?.trim() || "Product";
}

/** Active storefront catalog for the gift box builder (no static demo items). */
export async function loadBuilderProducts(lang: Lang = "en"): Promise<BuilderProduct[]> {
  try {
    const res = await fetch("/api/products?limit=48&sort=newest", {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { products?: ApiProduct[] };
    const rows = json.products ?? [];
    if (rows.length === 0) return [];

    return rows
      .filter((p) => p.id && Number(p.price_egp) >= 0 && isAvailable(p))
      .map((p) => {
        const category = displayCategory(p.category ?? null);
        const tags: string[] = [];
        const dietary = p.dietary ?? [];
        if (dietary.some((d) => d.toLowerCase().includes("vegan"))) tags.push("vegan");
        if (dietary.some((d) => d.toLowerCase().includes("gluten"))) tags.push("gf");
        const imagesNormalized = normalizeProductImages(p.images, p.image_url ?? null);
        const imageUrl =
          primaryImageFromProduct(imagesNormalized, p.image_url ?? null) ??
          "/images/web-logo.png";

        return {
          id: p.id,
          productUuid: p.id,
          slug: p.slug!.trim(),
          name: productName(p, lang),
          price: Number(p.price_egp) || 0,
          emoji: emojiForCategory(category),
          category,
          tags,
          imageUrl,
          availableQuantity: p.stock ?? null,
        } satisfies BuilderProduct;
      });
  } catch {
    return [];
  }
}

export function builderFilterCategories(products: BuilderProduct[]): string[] {
  const cats = [...new Set(products.map((p) => p.category).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
  return ["All", ...cats];
}

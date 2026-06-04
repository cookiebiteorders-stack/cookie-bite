import type { BuilderProduct } from "@/lib/gift-box-builder/data";
import type { Lang } from "@/lib/i18n/translations";
import {
  normalizeProductImages,
  primaryImageFromProduct,
  resolveProductImageUrl,
} from "@/lib/products/media";

const BUILDER_CACHE_TTL_MS = 5 * 60 * 1000;
const BUILDER_CACHE_PREFIX = "gift-box-builder-products:";
const memoryCache = new Map<Lang, { ts: number; items: BuilderProduct[] }>();

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
  const now = Date.now();
  const cached = memoryCache.get(lang);
  if (cached && now - cached.ts < BUILDER_CACHE_TTL_MS) {
    return cached.items;
  }
  if (typeof window !== "undefined") {
    try {
      const raw = window.sessionStorage.getItem(`${BUILDER_CACHE_PREFIX}${lang}`);
      if (raw) {
        const parsed = JSON.parse(raw) as { ts?: number; items?: BuilderProduct[] };
        if (
          typeof parsed.ts === "number" &&
          Array.isArray(parsed.items) &&
          now - parsed.ts < BUILDER_CACHE_TTL_MS
        ) {
          memoryCache.set(lang, { ts: parsed.ts, items: parsed.items });
          return parsed.items;
        }
      }
    } catch {
      // ignore storage read issues
    }
  }

  const fetchWithTimeout = async (timeoutMs: number) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch("/api/products?limit=48&sort=newest", {
        cache: "no-store",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    let res: Response;
    try {
      res = await fetchWithTimeout(6500);
    } catch {
      // One retry for transient network drops on mobile/slow connections.
      res = await fetchWithTimeout(8500);
    }
    if (!res.ok) return [];
    const json = (await res.json()) as { products?: ApiProduct[] };
    const rows = json.products ?? [];
    if (rows.length === 0) return [];

    const items = rows
      .filter((p) => p.id && Number(p.price_egp) >= 0 && isAvailable(p))
      .map((p) => {
        const category = displayCategory(p.category ?? null);
        const tags: string[] = [];
        const dietary = p.dietary ?? [];
        if (dietary.some((d) => d.toLowerCase().includes("vegan"))) tags.push("vegan");
        if (dietary.some((d) => d.toLowerCase().includes("gluten"))) tags.push("gf");
        const imagesNormalized = normalizeProductImages(p.images, p.image_url ?? null);
        const imageUrl = resolveProductImageUrl(
          primaryImageFromProduct(imagesNormalized, p.image_url ?? null),
        );

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
    memoryCache.set(lang, { ts: now, items });
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(
          `${BUILDER_CACHE_PREFIX}${lang}`,
          JSON.stringify({ ts: now, items }),
        );
      } catch {
        // ignore storage write issues
      }
    }
    return items;
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

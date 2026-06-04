import type { Product } from "@/lib/data";
import { fetchJson } from "@/lib/http/fetch-json";
import type { Lang } from "@/lib/i18n/translations";
import { resolveProductImageUrl } from "@/lib/products/media";
import { isProductInStock } from "@/lib/products/stock";
import { coerceStringArray } from "@/lib/products/coerce";

export type ShopApiProduct = {
  id: string;
  slug: string;
  name: string;
  title_en: string | null;
  title_ar: string | null;
  description: string | null;
  description_en: string | null;
  description_ar: string | null;
  price_egp: number;
  compare_price_egp?: number | null;
  image_url: string | null;
  images: Array<{ url?: string | null }> | null;
  badges: string[] | null;
  category: string | null;
  is_active: boolean;
  stock: number;
  created_at: string;
};

export type CatalogProduct = Product & {
  inStock: boolean;
  createdAt: string;
};

const BADGE_SET = new Set(["bestseller", "new", "trending", "featured"]);

export function mapApiProductToCatalog(
  p: ShopApiProduct,
  descFallback: string,
  lang: Lang,
): CatalogProduct {
  const slug = p.slug?.trim() || "";
  const title =
    lang === "ar"
      ? p.title_ar || p.title_en || p.name
      : p.title_en || p.title_ar || p.name;
  const description =
    lang === "ar"
      ? p.description_ar || p.description_en || descFallback
      : p.description_en || p.description_ar || descFallback;
  const mainImage = resolveProductImageUrl(
    p.images?.find((img) => typeof img?.url === "string" && img.url)?.url || p.image_url,
  );
  const badges = coerceStringArray(p.badges).filter(
    (b): b is NonNullable<Product["badges"]>[number] => BADGE_SET.has(String(b)),
  );

  return {
    id: slug || p.id,
    productUuid: p.id,
    name: title,
    description,
    price: p.price_egp,
    comparePrice:
      p.compare_price_egp != null && Number.isFinite(Number(p.compare_price_egp))
        ? Number(p.compare_price_egp)
        : null,
    image: mainImage,
    category: p.category?.trim() || "Classic",
    badges: badges.length ? badges : undefined,
    stock: p.stock,
    inStock: isProductInStock(p.stock),
    createdAt: p.created_at,
  };
}

/** نفس مصدر `/shop` — كل الصفحات مع `is_active`. */
export async function fetchAllShopProducts(): Promise<ShopApiProduct[]> {
  const limit = 48;
  let page = 1;
  let totalPages = 1;
  const all: ShopApiProduct[] = [];

  while (page <= totalPages) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      sort: "newest",
    });
    const payload = await fetchJson<{
      products?: ShopApiProduct[];
      total_pages?: number;
    }>(`/api/products?${params.toString()}`, {
      cache: "no-store",
      timeoutMs: 12000,
      retries: 1,
      retryDelayMs: 350,
    });
    all.push(...(payload.products ?? []));
    totalPages = Math.max(1, Number(payload.total_pages ?? 1));
    page += 1;
  }

  return all;
}

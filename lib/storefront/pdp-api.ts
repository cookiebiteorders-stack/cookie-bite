import type { Product } from "@/lib/data";
import type { ProductRow } from "@/lib/db/types";
import type { Lang } from "@/lib/i18n/translations";
import {
  productRowToStorefrontProduct,
  type StorefrontVariantRowInput,
} from "@/lib/storefront/map-product-row";
import type { RatingDistribution } from "@/lib/storefront/review-stats";

export type PdpReview = import("@/lib/storefront/pdp-data").PdpReview;

export type PdpApiPayload = {
  product: Product;
  addons: import("@/lib/addons/types").Addon[];
  related: Product[];
  fbt: Product[];
  reviews: PdpReview[];
  reviewCount: number;
  avgRating: number | null;
  ratingDistribution: RatingDistribution;
};

const FALLBACK_DESC = "Fresh handcrafted treats from Cookie Bite — New Cairo.";

function appOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    "http://127.0.0.1:3000";
  return raw.replace(/\/$/, "");
}

/** جلب PDP عبر مسار API العام (نفس المصدر الذي يعمل على الإنتاج). */
export async function fetchPdpPayloadFromApi(
  slug: string,
  lang: Lang = "en",
): Promise<PdpApiPayload | null> {
  const url = `${appOrigin()}/api/products/${encodeURIComponent(slug)}?lang=${lang}&related=1&addons=1&fbt=1&reviews=1`;
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      product?: ProductRow;
      addons?: import("@/lib/addons/types").Addon[];
      related?: Product[];
      fbt?: Product[];
      reviews?: PdpReview[];
      variants?: StorefrontVariantRowInput[];
      review_count?: number;
      avg_rating?: number | null;
      rating_distribution?: RatingDistribution;
    };
    if (!json.product?.slug) return null;
    const product = productRowToStorefrontProduct(json.product, FALLBACK_DESC, lang, {
      variants: json.variants ?? [],
    });
    const related = (json.related ?? []).filter((p) => p.id !== product.id);
    const fbt = (json.fbt ?? []).filter((p) => p.id !== product.id);
    return {
      product,
      addons: json.addons ?? [],
      related,
      fbt,
      reviews: json.reviews ?? [],
      reviewCount: json.review_count ?? 0,
      avgRating: json.avg_rating ?? null,
      ratingDistribution: json.rating_distribution ?? {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      },
    };
  } catch (e) {
    console.error("[fetchPdpPayloadFromApi]", slug, e);
    return null;
  }
}

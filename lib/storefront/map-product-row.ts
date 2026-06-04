import type { Product } from "@/lib/data";
import type { ProductRow } from "@/lib/db/types";
import type { Lang } from "@/lib/i18n/translations";
import {
  galleryUrlsFromProduct,
  normalizeProductImages,
  primaryImageFromProduct,
  resolveProductImageUrl,
} from "@/lib/products/media";

const BADGE_SET = new Set(["bestseller", "new", "trending", "featured"]);

/**
 * يحوّل صف منتج من Supabase إلى شكل `Product` للمتجر.
 * `id` في الناتج = **slug** (روابط PDP والسلة وPaymob).
 */
export function productRowToStorefrontProduct(
  row: ProductRow,
  descriptionFallback: string,
  lang: Lang = "en",
): Product {
  const name =
    lang === "ar"
      ? row.title_ar?.trim() || row.title_en?.trim() || row.name || row.slug
      : row.title_en?.trim() || row.title_ar?.trim() || row.name || row.slug;
  const description =
    lang === "ar"
      ? row.description_ar?.trim() ||
        row.description_en?.trim() ||
        row.description?.trim() ||
        descriptionFallback
      : row.description_en?.trim() ||
        row.description_ar?.trim() ||
        row.description?.trim() ||
        descriptionFallback;
  const imagesNormalized = normalizeProductImages(row.images, row.image_url);
  const gallery = galleryUrlsFromProduct(imagesNormalized, row.image_url);
  const mainImage = resolveProductImageUrl(
    primaryImageFromProduct(imagesNormalized, row.image_url),
  );
  const videoUrl = row.video_url?.trim() || null;
  const badges = (row.badges ?? []).filter(
    (b): b is NonNullable<Product["badges"]>[number] => BADGE_SET.has(String(b)),
  );

  return {
    id: row.slug,
    productUuid: row.id,
    name,
    description,
    price: Number(row.price_egp),
    comparePrice:
      row.compare_price_egp != null && Number.isFinite(Number(row.compare_price_egp))
        ? Number(row.compare_price_egp)
        : null,
    image: mainImage,
    images: gallery.length ? gallery : [mainImage],
    videoUrl,
    category: row.category ?? "Classic",
    badges: badges.length ? badges : undefined,
    stock: row.stock,
  };
}

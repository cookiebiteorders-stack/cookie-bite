import type { Product } from "@/lib/data";
import type { ProductRow } from "@/lib/db/types";
import {
  galleryUrlsFromProduct,
  normalizeProductImages,
  primaryImageFromProduct,
} from "@/lib/products/media";

const BADGE_SET = new Set(["bestseller", "new", "trending"]);

/**
 * يحوّل صف منتج من Supabase إلى شكل `Product` للمتجر.
 * `id` في الناتج = **slug** (روابط PDP والسلة وPaymob).
 */
export function productRowToStorefrontProduct(
  row: ProductRow,
  descriptionFallback: string,
): Product {
  const name =
    row.title_en?.trim() || row.title_ar?.trim() || row.name || row.slug;
  const description =
    row.description_en?.trim() ||
    row.description_ar?.trim() ||
    row.description?.trim() ||
    descriptionFallback;
  const imagesNormalized = normalizeProductImages(row.images, row.image_url);
  const gallery = galleryUrlsFromProduct(imagesNormalized, row.image_url);
  const mainImage =
    primaryImageFromProduct(imagesNormalized, row.image_url) ?? "/images/web-logo.png";
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
    image: mainImage,
    images: gallery.length ? gallery : [mainImage],
    videoUrl,
    category: row.category ?? "Classic",
    badges: badges.length ? badges : undefined,
    stock: row.stock,
  };
}

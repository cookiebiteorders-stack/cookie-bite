import type { Product, ProductVariant } from "@/lib/data";
import type { ProductRow } from "@/lib/db/types";
import type { Lang } from "@/lib/i18n/translations";
import { coerceStringArray } from "@/lib/products/coerce";
import {
  galleryUrlsFromProduct,
  normalizeProductImages,
  primaryImageFromProduct,
  PRODUCT_IMAGE_WIDTH_LISTING,
  resolveProductImageUrl,
} from "@/lib/products/media";

export type StorefrontProductImageOptions = {
  imageWidth?: number;
};

/** صف حجم خام من Supabase (product_variants). */
export type StorefrontVariantRowInput = {
  id: string;
  name: string;
  sku: string | null;
  price_egp: number | null;
  compare_price_egp?: number | null;
  stock: number;
  weight_grams?: number | null;
  pieces_count?: number | null;
  image_url?: string | null;
  options?: Record<string, unknown> | null;
};

/** يحوّل صفوف الأحجام الخام إلى أحجام المتجر؛ السعر يرث من المنتج عند غيابه. */
export function mapVariantRowsToStorefront(
  rows: StorefrontVariantRowInput[],
  parentPrice: number,
): ProductVariant[] {
  return rows.map((row) => {
    const price =
      row.price_egp != null && Number.isFinite(Number(row.price_egp))
        ? Number(row.price_egp)
        : parentPrice;
    const size =
      row.options && typeof row.options.size === "string" ? row.options.size : null;
    return {
      id: row.id,
      name: row.name,
      size,
      price,
      comparePrice:
        row.compare_price_egp != null && Number.isFinite(Number(row.compare_price_egp))
          ? Number(row.compare_price_egp)
          : null,
      stock: Number(row.stock ?? 0),
      weightGrams:
        row.weight_grams != null && Number.isFinite(Number(row.weight_grams))
          ? Number(row.weight_grams)
          : null,
      piecesCount:
        row.pieces_count != null && Number.isFinite(Number(row.pieces_count))
          ? Number(row.pieces_count)
          : null,
      sku: row.sku?.trim() || null,
      image: row.image_url?.trim() || null,
    };
  });
}

const BADGE_SET = new Set(["bestseller", "new", "trending", "featured"]);

/**
 * يحوّل صف منتج من Supabase إلى شكل `Product` للمتجر.
 * `id` في الناتج = **slug** (روابط PDP والسلة وPaymob).
 */
export function productRowToStorefrontProduct(
  row: ProductRow,
  descriptionFallback: string,
  lang: Lang = "en",
  options?: StorefrontProductImageOptions & {
    variants?: StorefrontVariantRowInput[];
  },
): Product {
  const imageWidth = options?.imageWidth ?? PRODUCT_IMAGE_WIDTH_LISTING;
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
  const gallery = galleryUrlsFromProduct(imagesNormalized, row.image_url).map((url) =>
    resolveProductImageUrl(url, imageWidth),
  );
  const mainImage = resolveProductImageUrl(
    primaryImageFromProduct(imagesNormalized, row.image_url),
    imageWidth,
  );
  const videoUrl = row.video_url?.trim() || null;
  const badges = coerceStringArray(row.badges).filter(
    (b): b is NonNullable<Product["badges"]>[number] => BADGE_SET.has(String(b)),
  );

  const dietary = coerceStringArray(row.dietary);
  const seasons = coerceStringArray(row.seasons);

  const parentPrice = Number(row.price_egp);
  const variants = options?.variants?.length
    ? mapVariantRowsToStorefront(options.variants, parentPrice)
    : undefined;
  const hasVariants = Boolean(variants && variants.length > 0);
  const priceFrom = hasVariants
    ? Math.min(...variants!.map((v) => v.price))
    : undefined;

  return {
    id: row.slug,
    productUuid: row.id,
    name,
    description,
    price: hasVariants ? priceFrom! : parentPrice,
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
    sku: row.sku?.trim() || null,
    weightGrams:
      row.weight_grams != null && Number.isFinite(Number(row.weight_grams))
        ? Number(row.weight_grams)
        : null,
    piecesCount:
      row.pieces_count != null && Number.isFinite(Number(row.pieces_count))
        ? Number(row.pieces_count)
        : null,
    dietary: dietary.length ? dietary : undefined,
    seasons: seasons.length ? seasons : undefined,
    variants,
    hasVariants,
    priceFrom,
  };
}

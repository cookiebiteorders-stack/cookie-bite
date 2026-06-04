import type { ProductImage } from "@/lib/db/types";
import { optimizeCloudinaryDeliveryUrl } from "@/lib/products/cloudinary-delivery";

export const MAX_PRODUCT_IMAGES = 5;

/** صورة افتراضية للمنتجات بدون صور — public/images/product-coming-soon.png */
export const PRODUCT_PLACEHOLDER_IMAGE = "/images/product-coming-soon.png";

export function resolveProductImageUrl(url?: string | null, width = 1200): string {
  const trimmed = url?.trim();
  if (!trimmed) return PRODUCT_PLACEHOLDER_IMAGE;
  return optimizeCloudinaryDeliveryUrl(trimmed, width) || PRODUCT_PLACEHOLDER_IMAGE;
}

export function normalizeProductImages(
  raw: unknown,
  fallbackUrl?: string | null,
): ProductImage[] {
  const list = Array.isArray(raw) ? raw : [];
  const parsed: ProductImage[] = [];
  for (let i = 0; i < list.length && parsed.length < MAX_PRODUCT_IMAGES; i++) {
    const item = list[i];
    if (!item || typeof item !== "object") continue;
    const url = String((item as ProductImage).url ?? "").trim();
    if (!url) continue;
    parsed.push({
      url,
      alt_en: (item as ProductImage).alt_en ?? null,
      alt_ar: (item as ProductImage).alt_ar ?? null,
      order: parsed.length,
    });
  }
  if (parsed.length === 0 && fallbackUrl?.trim()) {
    return [{ url: fallbackUrl.trim(), order: 0 }];
  }
  return parsed;
}

export function primaryImageFromProduct(
  images: ProductImage[],
  imageUrl?: string | null,
): string | null {
  const first = images.find((img) => img.url?.trim())?.url?.trim();
  return first ?? imageUrl?.trim() ?? null;
}

export function galleryUrlsFromProduct(
  images: ProductImage[],
  imageUrl?: string | null,
): string[] {
  const urls = images
    .map((img) => img.url?.trim())
    .filter((u): u is string => Boolean(u));
  if (urls.length > 0) return urls.slice(0, MAX_PRODUCT_IMAGES);
  const single = imageUrl?.trim();
  return single ? [single] : [];
}

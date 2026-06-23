import type { SupabaseClient } from "@supabase/supabase-js";
import { cloudinaryAssetKey } from "@/lib/cloudinary/asset-key";
import { galleryUrlsFromProduct, normalizeProductImages } from "@/lib/products/media";

function addUrl(keys: Set<string>, urls: Set<string>, value: unknown) {
  if (typeof value !== "string") return;
  const trimmed = value.trim();
  if (!trimmed) return;
  urls.add(trimmed);
  const key = cloudinaryAssetKey(trimmed);
  if (key) keys.add(key);
}

function addJsonUrls(keys: Set<string>, urls: Set<string>, raw: unknown) {
  if (!Array.isArray(raw)) return;
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    addUrl(keys, urls, (item as { url?: unknown }).url);
  }
}

export type ReferencedCloudinaryMedia = {
  publicIds: Set<string>;
  urls: Set<string>;
};

/** Every Cloudinary asset key still linked in the catalog (products, variants, gift boxes). */
export async function collectReferencedCloudinaryMedia(
  supabase: SupabaseClient,
): Promise<ReferencedCloudinaryMedia> {
  const publicIds = new Set<string>();
  const urls = new Set<string>();

  const { data: products } = await supabase
    .from("products")
    .select("image_url, images, video_url")
    .limit(5000);

  for (const row of products ?? []) {
    const images = normalizeProductImages(row.images, row.image_url);
    for (const url of galleryUrlsFromProduct(images, row.image_url)) {
      addUrl(publicIds, urls, url);
    }
    addUrl(publicIds, urls, row.video_url);
  }

  const { data: variants } = await supabase
    .from("product_variants")
    .select("image_url")
    .not("image_url", "is", null)
    .limit(5000);

  for (const row of variants ?? []) {
    addUrl(publicIds, urls, row.image_url);
  }

  const { data: giftSizes } = await supabase
    .from("gift_box_sizes")
    .select("image_url")
    .not("image_url", "is", null)
    .limit(200);

  for (const row of giftSizes ?? []) {
    addUrl(publicIds, urls, row.image_url);
  }

  return { publicIds, urls };
}

export function isCloudinaryAssetReferenced(
  asset: { publicId: string; url: string },
  refs: ReferencedCloudinaryMedia,
): boolean {
  const key = cloudinaryAssetKey(asset.publicId) ?? cloudinaryAssetKey(asset.url);
  if (key && refs.publicIds.has(key)) return true;
  if (refs.urls.has(asset.url)) return true;
  for (const refUrl of refs.urls) {
    if (cloudinaryAssetKey(refUrl) === key) return true;
  }
  return false;
}

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  galleryUrlsFromProduct,
  normalizeProductImages,
  primaryImageFromProduct,
} from "@/lib/products/media";

type ProductRow = {
  id: string;
  image_url: string | null;
  images: unknown;
  video_url: string | null;
};

function stripUrlFromProduct(row: ProductRow, targetUrl: string): Partial<ProductRow> | null {
  const images = normalizeProductImages(row.images, row.image_url);
  const nextImages = images
    .filter((img) => img.url?.trim() !== targetUrl)
    .map((img, i) => ({ ...img, order: i }));

  let video_url = row.video_url?.trim() ?? null;
  if (video_url === targetUrl) video_url = null;

  let image_url = row.image_url?.trim() ?? null;
  if (image_url === targetUrl) image_url = null;

  const primary = primaryImageFromProduct(nextImages, image_url);
  const beforeUrls = new Set<string>();
  for (const u of galleryUrlsFromProduct(images, row.image_url)) beforeUrls.add(u);
  if (row.video_url?.trim()) beforeUrls.add(row.video_url.trim());
  if (!beforeUrls.has(targetUrl)) return null;

  return {
    images: nextImages.length > 0 ? nextImages : [],
    image_url: primary,
    video_url,
  };
}

function swapUrlInProduct(row: ProductRow, oldUrl: string, newUrl: string): Partial<ProductRow> | null {
  const images = normalizeProductImages(row.images, row.image_url);
  let changed = false;
  const nextImages = images.map((img) => {
    if (img.url?.trim() === oldUrl) {
      changed = true;
      return { ...img, url: newUrl };
    }
    return img;
  });

  let video_url = row.video_url?.trim() ?? null;
  if (video_url === oldUrl) {
    video_url = newUrl;
    changed = true;
  }

  let image_url = row.image_url?.trim() ?? null;
  if (image_url === oldUrl) {
    image_url = newUrl;
    changed = true;
  }

  if (!changed) return null;

  const primary = primaryImageFromProduct(nextImages, image_url);
  return {
    images: nextImages,
    image_url: primary,
    video_url,
  };
}

/** Remove a media URL from every product that references it. */
export async function removeMediaUrlFromProducts(targetUrl: string): Promise<number> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, image_url, images, video_url")
    .limit(500);

  if (error) throw new Error(error.message);

  let updated = 0;
  for (const row of data ?? []) {
    const patch = stripUrlFromProduct(row as ProductRow, targetUrl);
    if (!patch) continue;
    const { error: upErr } = await supabase.from("products").update(patch).eq("id", row.id);
    if (upErr) throw new Error(upErr.message);
    updated += 1;
  }
  return updated;
}

/** Swap old URL for new URL on all products (after replace/rename). */
export async function replaceMediaUrlInProducts(oldUrl: string, newUrl: string): Promise<number> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, image_url, images, video_url")
    .limit(500);

  if (error) throw new Error(error.message);

  let updated = 0;
  for (const row of data ?? []) {
    const patch = swapUrlInProduct(row as ProductRow, oldUrl, newUrl);
    if (!patch) continue;
    const { error: upErr } = await supabase.from("products").update(patch).eq("id", row.id);
    if (upErr) throw new Error(upErr.message);
    updated += 1;
  }
  return updated;
}

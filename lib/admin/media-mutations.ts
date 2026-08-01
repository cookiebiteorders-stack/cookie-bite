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
  cloudinary_public_id: string | null;
};

type ProductMediaRow = {
  id: string;
  product_id: string;
  public_id: string;
  url: string;
  role: "primary" | "gallery" | "video";
  sort_order: number;
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

/** Remove a media URL from every product that references it via product_media join table. */
export async function removeMediaUrlFromProducts(targetUrl: string): Promise<number> {
  const supabase = createSupabaseAdminClient();
  
  // FK-driven: only affect products that have this URL in product_media
  const { data: mediaLinks, error: mediaError } = await supabase
    .from("product_media")
    .select("product_id, url")
    .eq("url", targetUrl);

  if (mediaError) throw new Error(mediaError.message);

  if (!mediaLinks || mediaLinks.length === 0) return 0;

  let updated = 0;
  for (const link of mediaLinks) {
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, image_url, images, video_url")
      .eq("id", link.product_id)
      .single();

    if (productError) continue;

    const patch = stripUrlFromProduct(product as ProductRow, targetUrl);
    if (!patch) continue;
    
    const { error: upErr } = await supabase.from("products").update(patch).eq("id", link.product_id);
    if (upErr) throw new Error(upErr.message);
    
    // Also delete the product_media link
    await supabase.from("product_media").delete().eq("url", targetUrl).eq("product_id", link.product_id);
    
    updated += 1;
  }
  return updated;
}

/** Swap old URL for new URL on products via product_media join table (FK-driven). */
export async function replaceMediaUrlInProducts(oldUrl: string, newUrl: string): Promise<number> {
  const supabase = createSupabaseAdminClient();
  
  // FK-driven: only affect products that have this URL in product_media
  const { data: mediaLinks, error: mediaError } = await supabase
    .from("product_media")
    .select("product_id, url")
    .eq("url", oldUrl);

  if (mediaError) throw new Error(mediaError.message);

  if (!mediaLinks || mediaLinks.length === 0) return 0;

  let updated = 0;
  for (const link of mediaLinks) {
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, image_url, images, video_url")
      .eq("id", link.product_id)
      .single();

    if (productError) continue;

    const patch = swapUrlInProduct(product as ProductRow, oldUrl, newUrl);
    if (!patch) continue;
    
    const { error: upErr } = await supabase.from("products").update(patch).eq("id", link.product_id);
    if (upErr) throw new Error(upErr.message);
    
    // Update the product_media link URL
    await supabase.from("product_media").update({ url: newUrl }).eq("url", oldUrl).eq("product_id", link.product_id);
    
    updated += 1;
  }
  return updated;
}

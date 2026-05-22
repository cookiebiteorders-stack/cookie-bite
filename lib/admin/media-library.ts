import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listCloudinaryAssets, type CloudinaryAsset } from "@/lib/cloudinary/list-resources";
import { galleryUrlsFromProduct, normalizeProductImages } from "@/lib/products/media";
import { cloudinaryConfig } from "@/lib/cloudinary/admin-upload";

export type MediaLibraryItem = CloudinaryAsset & {
  usedBy: Array<{ id: string; name: string; slug: string }>;
  source: "cloudinary" | "catalog";
};

function isCloudinaryUrl(url: string): boolean {
  return url.includes("res.cloudinary.com");
}

export async function loadProductUrlUsage(): Promise<Map<string, Array<{ id: string; name: string; slug: string }>>> {
  const map = new Map<string, Array<{ id: string; name: string; slug: string }>>();
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("products")
      .select("id, name, slug, image_url, images, video_url")
      .order("updated_at", { ascending: false })
      .limit(500);

    for (const row of data ?? []) {
      const images = normalizeProductImages(row.images, row.image_url);
      const urls = new Set<string>();
      for (const u of galleryUrlsFromProduct(images, row.image_url)) urls.add(u);
      if (row.video_url?.trim()) urls.add(row.video_url.trim());

      const ref = {
        id: row.id as string,
        name: (row.name as string) ?? "Product",
        slug: (row.slug as string) ?? row.id,
      };
      for (const url of urls) {
        const list = map.get(url) ?? [];
        if (!list.some((x) => x.id === ref.id)) list.push(ref);
        map.set(url, list);
      }
    }
  } catch (e) {
    console.warn("[media-library] product usage map", e);
  }
  return map;
}

export async function fetchMediaLibrary(): Promise<{
  configured: boolean;
  items: MediaLibraryItem[];
  productOnlyCount: number;
}> {
  const usage = await loadProductUrlUsage();
  const cloudinary = await listCloudinaryAssets();
  const seen = new Set<string>();
  const items: MediaLibraryItem[] = [];

  for (const asset of cloudinary.items) {
    seen.add(asset.url);
    items.push({
      ...asset,
      usedBy: usage.get(asset.url) ?? [],
      source: "cloudinary",
    });
  }

  let productOnlyCount = 0;
  if (cloudinary.configured) {
    for (const [url, usedBy] of usage) {
      if (seen.has(url)) continue;
      productOnlyCount += 1;
      const kind = /\.(mp4|webm|mov)(\?|$)/i.test(url) ? "video" : "image";
      items.push({
        id: url,
        url,
        publicId: "",
        kind,
        format: kind,
        bytes: 0,
        createdAt: new Date(0).toISOString(),
        folder: "",
        usedBy,
        source: "catalog",
      });
      seen.add(url);
    }
  } else {
    for (const [url, usedBy] of usage) {
      const kind = /\.(mp4|webm|mov)(\?|$)/i.test(url) ? "video" : "image";
      items.push({
        id: url,
        url,
        publicId: "",
        kind,
        format: kind,
        bytes: 0,
        createdAt: new Date(0).toISOString(),
        folder: isCloudinaryUrl(url) ? "cloudinary" : "external",
        usedBy,
        source: "catalog",
      });
    }
    productOnlyCount = items.length;
  }

  items.sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return tb - ta;
  });

  return {
    configured: Boolean(cloudinaryConfig()),
    items,
    productOnlyCount,
  };
}

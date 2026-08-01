import type { SupabaseClient } from "@supabase/supabase-js";
import { appendSlugSuffix, deriveProductSlug } from "@/lib/products/slug";
import { renameCloudinaryAsset } from "@/lib/cloudinary/manage-resource";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ProductInsertRow = Record<string, unknown>;

/**
 * Relocate pending uploads from _pending folder to product-specific folder
 * after product creation.
 */
async function relocatePendingUploadsToProduct(
  supabase: SupabaseClient,
  productId: string,
): Promise<void> {
  // Get the product's images to find any _pending URLs
  const { data: product } = await supabase
    .from("products")
    .select("images, cloudinary_public_id")
    .eq("id", productId)
    .single();

  if (!product) return;

  const images = product.images as Array<{ url: string; order?: number }> || [];
  let needsUpdate = false;
  const updatedImages: Array<{ url: string; order?: number }> = [];

  for (const img of images) {
    if (!img.url?.includes("/_pending/")) {
      updatedImages.push(img);
      continue;
    }

    // Extract public_id from URL
    const urlParts = img.url.split("/upload/");
    if (urlParts.length < 2) {
      updatedImages.push(img);
      continue;
    }

    const publicId = urlParts[1].split(".")[0]; // Remove extension
    const filename = publicId.split("/").pop() || publicId;
    const newPublicId = `cookie-bite/products/${productId}/${filename}`;

    try {
      // Rename the asset in Cloudinary
      const result = await renameCloudinaryAsset(publicId, newPublicId, "image");
      
      // Update the image URL
      updatedImages.push({ ...img, url: result.url });
      needsUpdate = true;
    } catch (error) {
      // If rename fails, keep the original URL
      console.error(`Failed to rename pending asset ${publicId}:`, error);
      updatedImages.push(img);
    }
  }

  // Update product if any images were relocated
  if (needsUpdate) {
    await supabase
      .from("products")
      .update({ images: updatedImages })
      .eq("id", productId);
  }
}

/**
 * Inserts a product row with slug collision retries (Postgres 23505).
 */
export async function insertProductWithSlugRetry(
  supabase: SupabaseClient,
  name: string,
  explicitSlug: string | undefined,
  buildRow: (slug: string) => ProductInsertRow,
  maxAttempts = 8,
): Promise<{ data: Record<string, unknown>; slug: string } | { error: { code?: string; message?: string } }> {
  const baseSlug = deriveProductSlug(name, explicitSlug?.trim());

  let lastError: { code?: string; message?: string } | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const slug = appendSlugSuffix(baseSlug, attempt);
    const row = buildRow(slug);
    const result = await supabase.from("products").insert(row).select("*").single();
    if (!result.error && result.data) {
      // Relocate pending uploads after successful product creation
      await relocatePendingUploadsToProduct(supabase, String(result.data.id));
      
      return { data: result.data as Record<string, unknown>, slug };
    }
    lastError = result.error;
    const code = String(result.error?.code ?? "");
    if (code !== "23505") break;
  }

  return { error: lastError ?? { message: "insert failed" } };
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { destroyCloudinaryAsset } from "@/lib/cloudinary/manage-resource";
import {
  collectReferencedCloudinaryMedia,
  isCloudinaryAssetReferenced,
} from "@/lib/cloudinary/referenced-media";
import { listAllCloudinaryAssets, type CloudinaryAsset } from "@/lib/cloudinary/list-resources";

const DEFAULT_MIN_AGE_DAYS = 14;
const MAX_DELETES_PER_RUN = 80;

export type CloudinaryOrphanCleanupResult = {
  configured: boolean;
  scanned: number;
  orphans: number;
  deleted: number;
  failed: number;
  skippedYoung: number;
  dryRun: boolean;
  errors: string[];
};

function assetAgeMs(asset: CloudinaryAsset): number {
  const created = new Date(asset.createdAt).getTime();
  return Number.isFinite(created) ? Date.now() - created : 0;
}

/** حذف أصول Cloudinary غير المربوطة بأي منتج/متغير/صندوق هدية. */
export async function runCloudinaryOrphanCleanup(
  supabase: SupabaseClient,
  opts?: { minAgeDays?: number; dryRun?: boolean; maxDeletes?: number },
): Promise<CloudinaryOrphanCleanupResult> {
  const minAgeDays = opts?.minAgeDays ?? DEFAULT_MIN_AGE_DAYS;
  const minAgeMs = minAgeDays * 24 * 60 * 60 * 1000;
  const dryRun = opts?.dryRun ?? false;
  const maxDeletes = opts?.maxDeletes ?? MAX_DELETES_PER_RUN;

  const listed = await listAllCloudinaryAssets();
  if (!listed.configured) {
    return {
      configured: false,
      scanned: 0,
      orphans: 0,
      deleted: 0,
      failed: 0,
      skippedYoung: 0,
      dryRun,
      errors: [],
    };
  }

  const refs = await collectReferencedCloudinaryMedia(supabase);
  let orphans = 0;
  let skippedYoung = 0;
  let deleted = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const asset of listed.items) {
    if (isCloudinaryAssetReferenced(asset, refs)) continue;

    if (assetAgeMs(asset) < minAgeMs) {
      skippedYoung += 1;
      continue;
    }

    orphans += 1;
    if (dryRun || deleted >= maxDeletes) continue;

    try {
      await destroyCloudinaryAsset(asset.publicId, asset.kind);
      deleted += 1;
    } catch (err) {
      failed += 1;
      const msg = err instanceof Error ? err.message : "destroy failed";
      if (errors.length < 8) errors.push(`${asset.publicId}: ${msg}`);
    }
  }

  return {
    configured: true,
    scanned: listed.items.length,
    orphans,
    deleted,
    failed,
    skippedYoung,
    dryRun,
    errors,
  };
}

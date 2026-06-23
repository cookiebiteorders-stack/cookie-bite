import { parseCloudinaryPublicId } from "@/lib/cloudinary/enhance-delivery";

/** Stable key for matching Cloudinary assets regardless of transforms in the URL. */
export function cloudinaryAssetKey(urlOrPublicId: string): string | null {
  const raw = urlOrPublicId.trim();
  if (!raw) return null;

  if (raw.includes("res.cloudinary.com")) {
    const parsed = parseCloudinaryPublicId(raw);
    return parsed ? parsed.publicId : null;
  }

  if (raw.startsWith("cookie-bite/")) return raw;
  return raw;
}

export function urlsShareCloudinaryAsset(a: string, b: string): boolean {
  const ka = cloudinaryAssetKey(a);
  const kb = cloudinaryAssetKey(b);
  return Boolean(ka && kb && ka === kb);
}

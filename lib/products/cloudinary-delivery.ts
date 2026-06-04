/**
 * Injects Cloudinary fetch transforms (f_auto, q_auto, width cap) for storefront delivery.
 * Safe on non-Cloudinary URLs and URLs that already include f_auto.
 */
export function optimizeCloudinaryDeliveryUrl(
  url: string | null | undefined,
  width = 1200,
): string {
  const trimmed = url?.trim() ?? "";
  if (!trimmed || !trimmed.includes("res.cloudinary.com")) return trimmed;
  if (/upload\/[^/]*f_auto/.test(trimmed)) return trimmed;

  const q = "auto";
  const transform = `f_auto,q_${q},w_${Math.min(Math.max(width, 320), 2000)}`;

  return trimmed.replace(/\/upload\/(v\d+\/)?/i, (_match, version?: string) =>
    version ? `/upload/${transform}/${version}` : `/upload/${transform}/`,
  );
}

/**
 * مساعدات Cloudinary للقراءة فقط (URL transformations).
 * الرفع يُنفَّذ من السيرفر باستخدام `CLOUDINARY_API_SECRET`.
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

export type CloudinaryTransform = {
  width?: number;
  height?: number;
  quality?: number | "auto";
  format?: "auto" | "webp" | "avif" | "jpg" | "png";
  crop?: "fill" | "fit" | "limit" | "scale" | "thumb";
  gravity?: "auto" | "center" | "face";
};

export function cloudinaryUrl(publicId: string, t: CloudinaryTransform = {}) {
  if (!CLOUD_NAME) {
    throw new Error("Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME");
  }

  const parts: string[] = ["f_" + (t.format ?? "auto"), "q_" + (t.quality ?? "auto")];
  if (t.width) parts.push(`w_${t.width}`);
  if (t.height) parts.push(`h_${t.height}`);
  if (t.crop) parts.push(`c_${t.crop}`);
  if (t.gravity) parts.push(`g_${t.gravity}`);

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${parts.join(",")}/${publicId}`;
}

export function isCloudinaryUrl(value: string) {
  return value.startsWith("https://res.cloudinary.com/");
}

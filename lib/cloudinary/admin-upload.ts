import { createHash } from "node:crypto";

export type CloudinaryUploadKind = "image" | "video";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
]);

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_VIDEO_BYTES = 48 * 1024 * 1024;

export function cloudinaryConfig() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

function cloudinarySignature(params: Record<string, string>, apiSecret: string) {
  const base = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(`${base}${apiSecret}`).digest("hex");
}

export async function uploadToCloudinary(
  file: File,
  kind: CloudinaryUploadKind,
  opts?: { folder?: string },
): Promise<{ url: string; public_id: string | null; bytes: number | null }> {
  const cfg = cloudinaryConfig();
  if (!cfg) throw new Error("Cloudinary is not configured");

  const allowed = kind === "image" ? IMAGE_TYPES : VIDEO_TYPES;
  const maxBytes = kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (!allowed.has(file.type)) {
    throw new Error(
      kind === "image"
        ? "Only JPG/PNG/WEBP/GIF are allowed"
        : "Only MP4/WEBM/MOV/AVI are allowed",
    );
  }
  if (file.size > maxBytes) {
    throw new Error(
      kind === "image" ? "Image is too large (max 6MB)" : "Video is too large (max 48MB)",
    );
  }

  const timestamp = String(Math.floor(Date.now() / 1000));
  const folder =
    opts?.folder ??
    (kind === "image" ? "cookie-bite/products" : "cookie-bite/products/videos");
  const signedParams: Record<string, string> = { folder, timestamp };
  if (kind === "video") signedParams.resource_type = "video";

  const signature = cloudinarySignature(signedParams, cfg.apiSecret);
  const uploadBody = new FormData();
  uploadBody.append("file", file);
  uploadBody.append("folder", folder);
  uploadBody.append("timestamp", timestamp);
  uploadBody.append("api_key", cfg.apiKey);
  uploadBody.append("signature", signature);
  if (kind === "video") uploadBody.append("resource_type", "video");

  const endpoint =
    kind === "image"
      ? `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`
      : `https://api.cloudinary.com/v1_1/${cfg.cloudName}/video/upload`;

  const cloudRes = await fetch(endpoint, { method: "POST", body: uploadBody });
  const cloudJson = (await cloudRes.json().catch(() => null)) as
    | {
        secure_url?: string;
        public_id?: string;
        bytes?: number;
        error?: { message?: string };
      }
    | null;

  if (!cloudRes.ok || !cloudJson?.secure_url) {
    throw new Error(cloudJson?.error?.message || "Upload failed");
  }

  return {
    url: cloudJson.secure_url,
    public_id: cloudJson.public_id ?? null,
    bytes: cloudJson.bytes ?? null,
  };
}

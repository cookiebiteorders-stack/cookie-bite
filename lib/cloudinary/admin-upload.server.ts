import "@/lib/server-only";

import { prepareImageBufferForUpload } from "@/lib/cloudinary/prepare-image-upload";
import {
  cloudinaryConfig,
  cloudinarySignature,
} from "@/lib/cloudinary/cloudinary-credentials";
import type { CloudinaryUploadKind } from "@/lib/cloudinary/upload-types";
import {
  MAX_IMAGE_UPLOAD_INPUT_BYTES,
  MAX_IMAGE_UPLOAD_OUTPUT_BYTES,
  MAX_VIDEO_UPLOAD_BYTES,
} from "@/lib/cloudinary/upload-limits";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);
const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
]);

export async function uploadToCloudinary(
  file: File,
  kind: CloudinaryUploadKind,
  opts?: { folder?: string; publicId?: string; overwrite?: boolean },
): Promise<{ url: string; public_id: string | null; bytes: number | null }> {
  const cfg = cloudinaryConfig();
  if (!cfg) throw new Error("Cloudinary is not configured");

  const allowed = kind === "image" ? IMAGE_TYPES : VIDEO_TYPES;
  const maxBytes = kind === "image" ? MAX_IMAGE_UPLOAD_INPUT_BYTES : MAX_VIDEO_UPLOAD_BYTES;
  if (!allowed.has(file.type)) {
    throw new Error(
      kind === "image"
        ? "Only JPG/PNG/WEBP/GIF/HEIC are allowed"
        : "Only MP4/WEBM/MOV/AVI are allowed",
    );
  }
  if (file.size > maxBytes) {
    throw new Error(
      kind === "image"
        ? `Image is too large (max ${Math.round(MAX_IMAGE_UPLOAD_INPUT_BYTES / (1024 * 1024))}MB)`
        : `Video is too large (max ${Math.round(MAX_VIDEO_UPLOAD_BYTES / (1024 * 1024))}MB)`,
    );
  }

  let uploadFile = file;
  if (kind === "image") {
    const raw = Buffer.from(await file.arrayBuffer());
    const prepared = await prepareImageBufferForUpload(raw, file.type, file.name);
    uploadFile = new File([new Uint8Array(prepared.buffer)], prepared.filename, {
      type: prepared.mimeType,
      lastModified: Date.now(),
    });
    if (uploadFile.size > MAX_IMAGE_UPLOAD_OUTPUT_BYTES) {
      throw new Error(
        `Image is too large after compression (max ${Math.round(MAX_IMAGE_UPLOAD_OUTPUT_BYTES / (1024 * 1024))}MB)`,
      );
    }
  }

  const timestamp = String(Math.floor(Date.now() / 1000));
  const folder =
    opts?.folder ??
    (kind === "image" ? "cookie-bite/products" : "cookie-bite/products/videos");
  const signedParams: Record<string, string> = { timestamp };
  if (opts?.publicId) {
    signedParams.public_id = opts.publicId;
    if (opts.overwrite) signedParams.overwrite = "true";
  } else {
    signedParams.folder = folder;
  }
  if (kind === "video") signedParams.resource_type = "video";

  const signature = cloudinarySignature(signedParams, cfg.apiSecret);
  const uploadBody = new FormData();
  uploadBody.append("file", uploadFile);
  uploadBody.append("timestamp", timestamp);
  uploadBody.append("api_key", cfg.apiKey);
  uploadBody.append("signature", signature);
  if (opts?.publicId) {
    uploadBody.append("public_id", opts.publicId);
    if (opts.overwrite) uploadBody.append("overwrite", "true");
  } else {
    uploadBody.append("folder", folder);
  }
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

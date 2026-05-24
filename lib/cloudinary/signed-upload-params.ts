import {
  cloudinaryConfig,
  cloudinarySignature,
  type CloudinaryUploadKind,
} from "@/lib/cloudinary/admin-upload";

export type SignedCloudinaryUpload = {
  cloudName: string;
  apiKey: string;
  timestamp: string;
  signature: string;
  folder: string;
  uploadUrl: string;
  kind: CloudinaryUploadKind;
};

export function createSignedCloudinaryUpload(
  kind: CloudinaryUploadKind,
  opts?: { folder?: string },
): SignedCloudinaryUpload | null {
  const cfg = cloudinaryConfig();
  if (!cfg) return null;

  const timestamp = String(Math.floor(Date.now() / 1000));
  const folder =
    opts?.folder ??
    (kind === "image" ? "cookie-bite/products" : "cookie-bite/products/videos");
  const signedParams: Record<string, string> = { timestamp, folder };
  if (kind === "video") signedParams.resource_type = "video";

  const signature = cloudinarySignature(signedParams, cfg.apiSecret);
  const uploadUrl =
    kind === "image"
      ? `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`
      : `https://api.cloudinary.com/v1_1/${cfg.cloudName}/video/upload`;

  return {
    cloudName: cfg.cloudName,
    apiKey: cfg.apiKey,
    timestamp,
    signature,
    folder,
    uploadUrl,
    kind,
  };
}

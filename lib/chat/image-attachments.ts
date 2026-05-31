import { MAX_IMAGE_UPLOAD_INPUT_BYTES } from "@/lib/cloudinary/upload-limits";

export const CHAT_IMAGE_MAX_BYTES = MAX_IMAGE_UPLOAD_INPUT_BYTES;
export const CHAT_IMAGE_MAX_COUNT = 4;
export const CHAT_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export type ChatImageAttachment = {
  url: string;
  mimeType?: string;
  name?: string;
};

export function isAllowedChatImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    if (u.hostname === "res.cloudinary.com") return true;
    if (u.hostname.endsWith(".cookie-bite.com") || u.hostname === "cookie-bite.com") return true;
    return false;
  } catch {
    return false;
  }
}

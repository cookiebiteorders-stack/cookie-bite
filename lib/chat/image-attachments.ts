import type { Part } from "@google/generative-ai";

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

export async function fetchImageInlineParts(urls: ChatImageAttachment[]): Promise<Part[]> {
  const parts: Part[] = [];
  for (const att of urls.slice(0, CHAT_IMAGE_MAX_COUNT)) {
    if (!isAllowedChatImageUrl(att.url)) continue;
    try {
      const res = await fetch(att.url, { signal: AbortSignal.timeout(12_000) });
      if (!res.ok) continue;
      const mime =
        att.mimeType?.split(";")[0]?.trim() ||
        res.headers.get("content-type")?.split(";")[0]?.trim() ||
        "image/jpeg";
      if (!CHAT_IMAGE_TYPES.has(mime)) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength > CHAT_IMAGE_MAX_BYTES) continue;
      parts.push({
        inlineData: {
          mimeType: mime,
          data: buf.toString("base64"),
        },
      });
    } catch {
      /* skip broken image */
    }
  }
  return parts;
}

export async function uploadChatImageFile(
  file: File,
  context: "admin" | "store",
): Promise<{ url: string; public_id: string | null }> {
  if (!CHAT_IMAGE_TYPES.has(file.type)) {
    throw new Error("Only JPG, PNG, WEBP, or GIF allowed");
  }
  if (file.size > CHAT_IMAGE_MAX_BYTES) {
    throw new Error(
      `Image is too large (max ${Math.round(CHAT_IMAGE_MAX_BYTES / (1024 * 1024))}MB)`,
    );
  }

  const folder =
    context === "admin" ? "cookie-bite/chat/copilot" : "cookie-bite/chat/mr-brownie";
  const { uploadToCloudinary } = await import("@/lib/cloudinary/admin-upload");
  const uploaded = await uploadToCloudinary(file, "image", { folder });
  return { url: uploaded.url, public_id: uploaded.public_id };
}

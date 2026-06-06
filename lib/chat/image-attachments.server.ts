import "@/lib/server-only";
import type { Part } from "@google/generative-ai";

import { uploadToCloudinary } from "@/lib/cloudinary/admin-upload.server";
import { inferImageMimeType } from "@/lib/chat/image-mime";
import {
  CHAT_IMAGE_MAX_BYTES,
  CHAT_IMAGE_MAX_COUNT,
  CHAT_IMAGE_TYPES,
  isAllowedChatImageUrl,
  type ChatImageAttachment,
} from "@/lib/chat/image-attachments";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

const CHAT_MEDIA_BUCKET = "chat-media";

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

async function uploadChatImageToSupabase(
  file: File,
  context: "admin" | "store",
  mimeType: string,
): Promise<{ url: string; public_id: string | null }> {
  const supabase = tryCreateSupabaseAdminClient();
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!supabase || !baseUrl) {
    throw new Error("Image upload is not configured (Cloudinary or Supabase)");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "image.jpg";
  const path = `${context}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

  const { error } = await supabase.storage.from(CHAT_MEDIA_BUCKET).upload(path, buffer, {
    contentType: mimeType,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message || "Supabase storage upload failed");
  }

  const { data } = supabase.storage.from(CHAT_MEDIA_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) {
    throw new Error("Could not resolve public URL for uploaded image");
  }

  return { url: data.publicUrl, public_id: path };
}

export async function uploadChatImageFile(
  file: File,
  context: "admin" | "store",
): Promise<{ url: string; public_id: string | null }> {
  const mimeType = inferImageMimeType(file);
  if (!CHAT_IMAGE_TYPES.has(mimeType)) {
    throw new Error("Only JPG, PNG, WEBP, or GIF allowed");
  }
  if (file.size > CHAT_IMAGE_MAX_BYTES) {
    throw new Error(
      `Image is too large (max ${Math.round(CHAT_IMAGE_MAX_BYTES / (1024 * 1024))}MB)`,
    );
  }

  const folder =
    context === "admin" ? "cookie-bite/chat/copilot" : "cookie-bite/chat/mr-brownie";

  try {
    const uploaded = await uploadToCloudinary(file, "image", { folder });
    return { url: uploaded.url, public_id: uploaded.public_id };
  } catch (cloudinaryErr) {
    const msg =
      cloudinaryErr instanceof Error ? cloudinaryErr.message : "Cloudinary upload failed";
    if (!msg.toLowerCase().includes("not configured")) {
      throw cloudinaryErr instanceof Error ? cloudinaryErr : new Error(msg);
    }
    return uploadChatImageToSupabase(file, context, mimeType);
  }
}

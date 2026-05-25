import sharp from "sharp";
import {
  CLIENT_IMAGE_TARGET_BYTES,
  IMAGE_UPLOAD_MAX_EDGE,
  MAX_IMAGE_UPLOAD_INPUT_BYTES,
  MAX_IMAGE_UPLOAD_OUTPUT_BYTES,
} from "@/lib/cloudinary/upload-limits";

export type PreparedImageUpload = {
  buffer: Buffer;
  mimeType: string;
  filename: string;
};

const SKIP_SHARP_TYPES = new Set(["image/gif", "image/svg+xml"]);
const FORCE_SHARP_TYPES = new Set(["image/heic", "image/heif"]);

function extForMime(mime: string): string {
  if (mime === "image/webp") return "webp";
  if (mime === "image/png") return "png";
  return "jpg";
}

/**
 * يصغّر صور كبيرة على الخادم قبل رفع Cloudinary (مكتبة الوسائط، المسارات الاحتياطية).
 */
export async function prepareImageBufferForUpload(
  input: Buffer,
  mimeType: string,
  originalName?: string,
): Promise<PreparedImageUpload> {
  if (input.byteLength > MAX_IMAGE_UPLOAD_INPUT_BYTES) {
    throw new Error(
      `Image is too large (max ${Math.round(MAX_IMAGE_UPLOAD_INPUT_BYTES / (1024 * 1024))}MB before processing)`,
    );
  }

  if (SKIP_SHARP_TYPES.has(mimeType)) {
    if (input.byteLength > MAX_IMAGE_UPLOAD_OUTPUT_BYTES) {
      throw new Error(
        `Image is too large (max ${Math.round(MAX_IMAGE_UPLOAD_OUTPUT_BYTES / (1024 * 1024))}MB)`,
      );
    }
    const ext = mimeType === "image/gif" ? "gif" : "svg";
    return { buffer: input, mimeType, filename: originalName || `upload.${ext}` };
  }

  if (!FORCE_SHARP_TYPES.has(mimeType) && input.byteLength <= CLIENT_IMAGE_TARGET_BYTES) {
    try {
      const meta = await sharp(input, { failOn: "none" }).metadata();
      const maxDim = Math.max(meta.width ?? 0, meta.height ?? 0);
      if (maxDim > 0 && maxDim <= IMAGE_UPLOAD_MAX_EDGE) {
        const base = (originalName ?? "upload").replace(/\.[^.]+$/, "") || "upload";
        return { buffer: input, mimeType, filename: `${base}.${extForMime(mimeType)}` };
      }
    } catch {
      /* fall through to re-encode */
    }
  }

  let pipeline = sharp(input, { failOn: "none" }).rotate();
  const meta = await pipeline.metadata();
  const maxDim = Math.max(meta.width ?? 0, meta.height ?? 0);
  if (maxDim > IMAGE_UPLOAD_MAX_EDGE) {
    pipeline = pipeline.resize(IMAGE_UPLOAD_MAX_EDGE, IMAGE_UPLOAD_MAX_EDGE, {
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const base = (originalName ?? "upload").replace(/\.[^.]+$/, "") || "upload";
  let quality = 86;
  let buffer = await pipeline.webp({ quality, effort: 4 }).toBuffer();

  while (buffer.byteLength > CLIENT_IMAGE_TARGET_BYTES && quality > 52) {
    quality -= 8;
    buffer = await pipeline.webp({ quality, effort: 4 }).toBuffer();
  }

  if (buffer.byteLength > MAX_IMAGE_UPLOAD_OUTPUT_BYTES) {
    buffer = await sharp(buffer)
      .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 72, effort: 4 })
      .toBuffer();
  }

  if (buffer.byteLength > MAX_IMAGE_UPLOAD_OUTPUT_BYTES) {
    throw new Error(
      `Image is too large after compression (max ${Math.round(MAX_IMAGE_UPLOAD_OUTPUT_BYTES / (1024 * 1024))}MB)`,
    );
  }

  return { buffer, mimeType: "image/webp", filename: `${base}.webp` };
}

import { inferImageMimeType } from "@/lib/chat/image-mime";
import { CLIENT_IMAGE_TARGET_BYTES, IMAGE_UPLOAD_MAX_EDGE } from "@/lib/cloudinary/upload-limits";

const MIN_QUALITY = 0.5;
const START_QUALITY = 0.88;
const PROCESS_IF_LARGER_THAN_BYTES = 512 * 1024;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("تعذّر قراءة الصورة"));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("فشل ضغط الصورة"))),
      type,
      quality,
    );
  });
}

function needsProcessing(file: File, width: number, height: number): boolean {
  if (file.size > CLIENT_IMAGE_TARGET_BYTES) return true;
  if (file.size > PROCESS_IF_LARGER_THAN_BYTES) return true;
  return Math.max(width, height) > IMAGE_UPLOAD_MAX_EDGE;
}

/**
 * يصغّر الصور الكبيرة على المتصفح قبل الرفع المباشر إلى Cloudinary.
 */
export async function compressImageFileForUpload(file: File): Promise<File> {
  const mimeType = inferImageMimeType(file);
  if (!mimeType.startsWith("image/") || mimeType === "image/gif" || mimeType === "image/svg+xml") {
    return file.type ? file : new File([file], file.name || "image.jpg", { type: mimeType });
  }

  const img = await loadImage(file);
  if (!needsProcessing(file, img.naturalWidth, img.naturalHeight)) {
    return file;
  }

  const scale = Math.min(1, IMAGE_UPLOAD_MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, w, h);

  const outType =
    mimeType === "image/png" || mimeType === "image/jpeg" ? "image/webp" : mimeType;
  let quality = START_QUALITY;
  let blob = await canvasToBlob(canvas, outType, quality);

  while (blob.size > CLIENT_IMAGE_TARGET_BYTES && quality > MIN_QUALITY) {
    quality -= 0.07;
    blob = await canvasToBlob(canvas, outType, quality);
  }

  if (blob.size > CLIENT_IMAGE_TARGET_BYTES && scale > 0.65) {
    const smaller = Math.max(0.5, scale * 0.75);
    canvas.width = Math.max(1, Math.round(img.naturalWidth * smaller));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * smaller));
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    quality = 0.78;
    blob = await canvasToBlob(canvas, outType, quality);
    while (blob.size > CLIENT_IMAGE_TARGET_BYTES && quality > MIN_QUALITY) {
      quality -= 0.08;
      blob = await canvasToBlob(canvas, outType, quality);
    }
  }

  const ext =
    outType === "image/webp" ? "webp" : outType === "image/png" ? "png" : "jpg";
  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${base}.${ext}`, { type: outType, lastModified: Date.now() });
}

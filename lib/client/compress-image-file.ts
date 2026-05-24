const MAX_EDGE = 2048;
const TARGET_MAX_BYTES = 2 * 1024 * 1024;
const MIN_QUALITY = 0.55;
const START_QUALITY = 0.88;

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

/**
 * يصغّر الصور الكبيرة على المتصفح قبل الرفع لتفادي حدود الخادم وتحسين السرعة.
 */
export async function compressImageFileForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }
  if (file.size <= TARGET_MAX_BYTES) {
    return file;
  }

  const img = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, w, h);

  const outType = file.type === "image/png" ? "image/webp" : file.type;
  let quality = START_QUALITY;
  let blob = await canvasToBlob(canvas, outType, quality);

  while (blob.size > TARGET_MAX_BYTES && quality > MIN_QUALITY) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, outType, quality);
  }

  const ext =
    outType === "image/webp" ? "webp" : outType === "image/png" ? "png" : "jpg";
  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${base}.${ext}`, { type: outType, lastModified: Date.now() });
}

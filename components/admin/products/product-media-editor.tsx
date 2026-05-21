"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import {
  GripVertical,
  ImagePlus,
  Loader2,
  Star,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { MAX_PRODUCT_IMAGES } from "@/lib/products/media";
import type { ProductImageFormItem } from "@/lib/admin/products-dashboard-types";
import { EMPTY_PRODUCT_IMAGE_SLOT } from "@/lib/admin/products-dashboard-types";
import { cn } from "@/lib/utils";

type Props = {
  images: ProductImageFormItem[];
  videoUrl: string;
  canWrite: boolean;
  onImagesChange: (images: ProductImageFormItem[]) => void;
  onVideoUrlChange: (url: string) => void;
  onLegacyImageUrlChange?: (url: string) => void;
};

async function uploadMedia(file: File, kind: "image" | "video"): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("kind", kind);
  const res = await fetch("/api/admin/products/upload-media", { method: "POST", body: fd });
  const data = (await res.json().catch(() => null)) as
    | {
        image?: { url?: string };
        video?: { url?: string };
        error?: { en?: string; ar?: string };
      }
    | null;
  if (!res.ok) {
    throw new Error(data?.error?.ar || data?.error?.en || "فشل الرفع");
  }
  const url = kind === "image" ? data?.image?.url : data?.video?.url;
  if (!url) throw new Error("فشل الرفع — لم يُرجَع رابط");
  return url;
}

function normalizeSlots(images: ProductImageFormItem[]): ProductImageFormItem[] {
  const list = images.slice(0, MAX_PRODUCT_IMAGES);
  while (list.length < 1) list.push({ ...EMPTY_PRODUCT_IMAGE_SLOT });
  return list;
}

export function ProductMediaEditor({
  images,
  videoUrl,
  canWrite,
  onImagesChange,
  onVideoUrlChange,
  onLegacyImageUrlChange,
}: Props) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const slots = normalizeSlots(images);
  const filledCount = slots.filter((img) => img.url.trim()).length;
  const isUploading = uploadingCount > 0;

  const syncImages = useCallback(
    (next: ProductImageFormItem[]) => {
      const normalized = normalizeSlots(next);
      onImagesChange(normalized);
      const primary = normalized.find((x) => x.url.trim())?.url.trim() ?? "";
      onLegacyImageUrlChange?.(primary);
    },
    [onImagesChange, onLegacyImageUrlChange],
  );

  const setImageAt = useCallback(
    (index: number, patch: Partial<ProductImageFormItem>) => {
      const next = [...slots];
      next[index] = { ...next[index], ...patch };
      syncImages(next);
    },
    [slots, syncImages],
  );

  const removeAt = useCallback(
    (index: number) => {
      const next = slots.filter((_, i) => i !== index);
      syncImages(next.length ? next : [{ ...EMPTY_PRODUCT_IMAGE_SLOT }]);
    },
    [slots, syncImages],
  );

  const move = useCallback(
    (index: number, dir: -1 | 1) => {
      const next = [...slots];
      const target = index + dir;
      if (target < 0 || target >= next.length) return;
      [next[index], next[target]] = [next[target]!, next[index]!];
      syncImages(next);
    },
    [slots, syncImages],
  );

  const uploadFilesToSlots = useCallback(
    async (files: File[], kind: "image" | "video") => {
      if (!canWrite || files.length === 0) return;
      setUploadError(null);
      setUploadingCount((c) => c + files.length);

      try {
        if (kind === "video") {
          const file = files[0];
          if (!file) return;
          const url = await uploadMedia(file, "video");
          onVideoUrlChange(url);
          return;
        }

        let slotIndex = 0;
        const next = [...slots];
        const emptyIndices = next
          .map((img, i) => (!img.url.trim() ? i : -1))
          .filter((i) => i >= 0);

        for (const file of files) {
          if (!file.type.startsWith("image/")) continue;
          let target =
            emptyIndices.shift() ??
            (slotIndex < MAX_PRODUCT_IMAGES ? slotIndex : -1);
          if (target < 0) {
            setUploadError(`الحد الأقصى ${MAX_PRODUCT_IMAGES} صور — احذف صورة لإضافة أخرى`);
            break;
          }
          const url = await uploadMedia(file, "image");
          while (next.length <= target) next.push({ ...EMPTY_PRODUCT_IMAGE_SLOT });
          next[target] = { ...next[target], url };
          slotIndex = target + 1;
        }
        syncImages(next);
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : "فشل الرفع");
      } finally {
        setUploadingCount(0);
      }
    },
    [canWrite, slots, syncImages, onVideoUrlChange],
  );

  const onImageDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (!canWrite) return;
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
      void uploadFilesToSlots(files.slice(0, MAX_PRODUCT_IMAGES), "image");
    },
    [canWrite, uploadFilesToSlots],
  );

  return (
    <div className="space-y-5">
      {/* صور — منطقة رفع */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-cb-text-strong">
            صور المنتج ({filledCount}/{MAX_PRODUCT_IMAGES})
          </p>
          <span className="text-[10px] text-cb-text-muted">الأولى = صورة رئيسية</span>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (canWrite) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onImageDrop}
          className={cn(
            "relative rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors",
            dragOver
              ? "border-cb-terracotta-dark bg-amber-50/90"
              : "border-cb-border/80 bg-white/60 hover:border-amber-300/80",
            !canWrite && "pointer-events-none opacity-50",
          )}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 text-cb-terracotta-dark">
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
              <p className="text-sm font-semibold">جاري رفع الصور…</p>
            </div>
          ) : (
            <>
              <Upload className="mx-auto h-8 w-8 text-cb-terracotta-dark/70" aria-hidden />
              <p className="mt-2 text-sm font-semibold text-cb-text-strong">
                اسحب الصور هنا أو اضغط للاختيار
              </p>
              <p className="mt-1 text-[11px] text-cb-text-muted">
                PNG · JPG · WebP — حتى {MAX_PRODUCT_IMAGES} صور
              </p>
              <button
                type="button"
                disabled={!canWrite || filledCount >= MAX_PRODUCT_IMAGES}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-l from-amber-500 to-cb-terracotta-dark px-4 py-2 text-xs font-bold text-white shadow-md disabled:opacity-40"
                onClick={() => imageInputRef.current?.click()}
              >
                <ImagePlus className="h-4 w-4" aria-hidden />
                اختيار صور
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                className="hidden"
                disabled={!canWrite || isUploading}
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  void uploadFilesToSlots(files, "image");
                  e.currentTarget.value = "";
                }}
              />
            </>
          )}
        </div>

        {/* شبكة المعاينات */}
        {filledCount > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {slots.map((img, index) => {
              if (!img.url.trim()) return null;
              return (
                <div
                  key={`preview-${index}-${img.url.slice(-12)}`}
                  className="group relative overflow-hidden rounded-xl border border-cb-border bg-white shadow-sm"
                >
                  {index === 0 ? (
                    <span className="absolute start-2 top-2 z-10 inline-flex items-center gap-0.5 rounded-full bg-cb-terracotta-dark px-2 py-0.5 text-[9px] font-bold text-white">
                      <Star className="h-3 w-3 fill-current" aria-hidden />
                      رئيسية
                    </span>
                  ) : null}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="aspect-square w-full object-cover" />
                  <div className="flex items-center justify-between gap-1 border-t border-cb-border/60 bg-cb-surface/80 p-1.5">
                    <div className="flex gap-0.5">
                      <button
                        type="button"
                        disabled={!canWrite || index === 0}
                        onClick={() => move(index, -1)}
                        className="rounded-md p-1 text-cb-text-muted hover:bg-cb-peach disabled:opacity-30"
                        aria-label="تحريك"
                      >
                        <GripVertical className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={!canWrite}
                        onClick={() => removeAt(index)}
                        className="rounded-md p-1 text-red-600 hover:bg-red-50"
                        aria-label="حذف"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <label className="cursor-pointer text-[10px] font-bold text-cb-terracotta-dark">
                      استبدال
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={!canWrite || isUploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            void (async () => {
                              setUploadError(null);
                              setUploadingCount(1);
                              try {
                                const url = await uploadMedia(f, "image");
                                setImageAt(index, { url });
                              } catch (err) {
                                setUploadError(err instanceof Error ? err.message : "فشل الرفع");
                              } finally {
                                setUploadingCount(0);
                              }
                            })();
                          }
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* روابط يدوية (اختياري) */}
        <details className="mt-3 rounded-xl border border-cb-border/60 bg-white/50 px-3 py-2">
          <summary className="cursor-pointer text-[11px] font-semibold text-cb-text-muted">
            لصق رابط صورة يدوياً
          </summary>
          <div className="mt-2 space-y-2">
            {slots.map((img, index) => (
              <input
                key={`url-${index}`}
                className="w-full rounded-lg border border-cb-border px-2 py-1.5 text-xs"
                placeholder={`رابط صورة ${index + 1}`}
                value={img.url}
                disabled={!canWrite}
                onChange={(e) => setImageAt(index, { url: e.target.value })}
              />
            ))}
          </div>
        </details>
      </div>

      {/* فيديو */}
      <div className="rounded-2xl border border-cb-border/70 bg-gradient-to-br from-white to-cb-surface/40 p-4">
        <p className="flex items-center gap-2 text-xs font-bold text-cb-text-strong">
          <Video className="h-4 w-4 text-cb-terracotta-dark" aria-hidden />
          فيديو المنتج (اختياري)
        </p>
        {videoUrl.trim() ? (
          <video
            src={videoUrl}
            controls
            playsInline
            preload="metadata"
            className="mt-3 max-h-44 w-full rounded-xl border border-cb-border bg-black object-contain"
          />
        ) : (
          <p className="mt-2 text-[11px] text-cb-text-muted">MP4 أو WebM — يظهر في صفحة المنتج</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canWrite || isUploading}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-cb-border bg-white px-3 py-2 text-xs font-bold text-cb-text-strong hover:border-amber-300 disabled:opacity-40"
            onClick={() => videoInputRef.current?.click()}
          >
            {isUploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            رفع فيديو
          </button>
          {videoUrl.trim() ? (
            <button
              type="button"
              disabled={!canWrite}
              className="rounded-full px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
              onClick={() => onVideoUrlChange("")}
            >
              إزالة الفيديو
            </button>
          ) : null}
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            disabled={!canWrite || isUploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadFilesToSlots([f], "video");
              e.currentTarget.value = "";
            }}
          />
        </div>
        <input
          className="mt-2 w-full rounded-xl border border-cb-border bg-white px-3 py-2 text-xs"
          placeholder="أو الصق رابط الفيديو https://..."
          value={videoUrl}
          disabled={!canWrite}
          onChange={(e) => onVideoUrlChange(e.target.value)}
        />
      </div>

      {uploadError ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{uploadError}</p>
      ) : null}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
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
import {
  enqueueProductMediaUpload,
  getProductMediaUploadBusyCount,
  subscribeProductMediaUploads,
} from "@/lib/client/product-media-upload";
import { cn } from "@/lib/utils";

type Props = {
  productId?: string | null;
  images: ProductImageFormItem[];
  videoUrl: string;
  canWrite: boolean;
  onImagesChange: (images: ProductImageFormItem[]) => void;
  onVideoUrlChange: (url: string) => void;
  onLegacyImageUrlChange?: (url: string) => void;
};

function normalizeSlots(images: ProductImageFormItem[]): ProductImageFormItem[] {
  const list = images.slice(0, MAX_PRODUCT_IMAGES);
  while (list.length < 1) list.push({ ...EMPTY_PRODUCT_IMAGE_SLOT });
  return list;
}

export function ProductMediaEditor({
  productId = null,
  images,
  videoUrl,
  canWrite,
  onImagesChange,
  onVideoUrlChange,
  onLegacyImageUrlChange,
}: Props) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [slotProgress, setSlotProgress] = useState<Record<number, number>>({});
  const [globalBusy, setGlobalBusy] = useState(0);

  const slotsRef = useRef<ProductImageFormItem[]>(normalizeSlots(images));
  slotsRef.current = normalizeSlots(images);

  const slots = normalizeSlots(images);
  const filledCount = slots.filter((img) => img.url.trim()).length;
  const isUploading = globalBusy > 0 || Object.keys(slotProgress).length > 0;

  useEffect(() => {
    const sync = () => setGlobalBusy(getProductMediaUploadBusyCount());
    sync();
    return subscribeProductMediaUploads(sync);
  }, []);

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
      const next = [...slotsRef.current];
      next[index] = { ...next[index], ...patch };
      syncImages(next);
    },
    [syncImages],
  );

  const removeAt = useCallback(
    (index: number) => {
      const next = slotsRef.current.filter((_, i) => i !== index);
      syncImages(next.length ? next : [{ ...EMPTY_PRODUCT_IMAGE_SLOT }]);
    },
    [syncImages],
  );

  const move = useCallback(
    (index: number, dir: -1 | 1) => {
      const next = [...slotsRef.current];
      const target = index + dir;
      if (target < 0 || target >= next.length) return;
      [next[index], next[target]] = [next[target]!, next[index]!];
      syncImages(next);
    },
    [syncImages],
  );

  const applyUrlToSlot = useCallback(
    (target: number, url: string) => {
      const next = [...slotsRef.current];
      while (next.length <= target) next.push({ ...EMPTY_PRODUCT_IMAGE_SLOT });
      next[target] = { ...next[target], url };
      syncImages(next);
    },
    [syncImages],
  );

  const startImageUpload = useCallback(
    (file: File, target: number) => {
      setUploadError(null);
      setSlotProgress((p) => ({ ...p, [target]: 0 }));

      enqueueProductMediaUpload({
        productId,
        file,
        kind: "image",
        onProgress: (pct) => setSlotProgress((p) => ({ ...p, [target]: pct })),
        onSuccess: (url) => {
          applyUrlToSlot(target, url);
          setSlotProgress((p) => {
            const next = { ...p };
            delete next[target];
            return next;
          });
        },
        onError: (message) => {
          setUploadError(message);
          setSlotProgress((p) => {
            const next = { ...p };
            delete next[target];
            return next;
          });
        },
      });
    },
    [applyUrlToSlot, productId],
  );

  const uploadFilesToSlots = useCallback(
    (files: File[], kind: "image" | "video") => {
      if (!canWrite || files.length === 0) return;
      setUploadError(null);

      if (kind === "video") {
        const file = files[0];
        if (!file) return;
        enqueueProductMediaUpload({
          productId,
          file,
          kind: "video",
          onSuccess: (url) => onVideoUrlChange(url),
          onError: (message) => setUploadError(message),
        });
        return;
      }

      const next = [...slotsRef.current];
      const emptyIndices = next
        .map((img, i) => (!img.url.trim() ? i : -1))
        .filter((i) => i >= 0);

      let slotIndex = 0;
      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        const target =
          emptyIndices.shift() ??
          (slotIndex < MAX_PRODUCT_IMAGES ? slotIndex : -1);
        if (target < 0) {
          setUploadError(`الحد الأقصى ${MAX_PRODUCT_IMAGES} صور — احذف صورة لإضافة أخرى`);
          break;
        }
        startImageUpload(file, target);
        slotIndex = target + 1;
      }
    },
    [canWrite, onVideoUrlChange, startImageUpload],
  );

  const onImageDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (!canWrite) return;
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/"),
      );
      uploadFilesToSlots(files.slice(0, MAX_PRODUCT_IMAGES), "image");
    },
    [canWrite, uploadFilesToSlots],
  );

  const overallPct =
    Object.values(slotProgress).length > 0
      ? Math.round(
          Object.values(slotProgress).reduce((a, b) => a + b, 0) /
            Object.values(slotProgress).length,
        )
      : 0;

  return (
    <div className="space-y-5">
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
              <p className="text-sm font-semibold">
                جاري رفع الصور… {overallPct > 0 ? `${overallPct}%` : ""}
              </p>
              {overallPct > 0 ? (
                <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-amber-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-amber-500 to-cb-terracotta-dark transition-all duration-300"
                    style={{ width: `${overallPct}%` }}
                  />
                </div>
              ) : null}
              <p className="text-[10px] text-cb-text-muted">
                يمكنك حفظ المنتج — يستمر الرفع في الخلفية
              </p>
            </div>
          ) : (
            <>
              <Upload className="mx-auto h-8 w-8 text-cb-terracotta-dark/70" aria-hidden />
              <p className="mt-2 text-sm font-semibold text-cb-text-strong">
                اسحب الصور هنا أو اضغط للاختيار
              </p>
              <p className="mt-1 text-[11px] text-cb-text-muted">
                PNG · JPG · WebP — تُضغَّط تلقائياً إن كانت كبيرة
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
                accept="image/png,image/jpeg,image/webp,image/gif,image/heic,image/heif"
                multiple
                className="hidden"
                disabled={!canWrite}
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  uploadFilesToSlots(files, "image");
                  e.currentTarget.value = "";
                }}
              />
            </>
          )}
        </div>

        {filledCount > 0 || Object.keys(slotProgress).length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {slots.map((img, index) => {
              const uploading = slotProgress[index] != null;
              if (!img.url.trim() && !uploading) return null;
              return (
                <div
                  key={`preview-${index}-${img.url.slice(-12) || "up"}`}
                  className="group relative overflow-hidden rounded-xl border border-cb-border bg-white shadow-sm"
                >
                  {index === 0 && img.url.trim() ? (
                    <span className="absolute start-2 top-2 z-10 inline-flex items-center gap-0.5 rounded-full bg-cb-terracotta-dark px-2 py-0.5 text-[9px] font-bold text-white">
                      <Star className="h-3 w-3 fill-current" aria-hidden />
                      رئيسية
                    </span>
                  ) : null}
                  {uploading ? (
                    <div className="flex aspect-square flex-col items-center justify-center gap-2 bg-amber-50/80 p-3">
                      <Loader2 className="h-6 w-6 animate-spin text-cb-terracotta-dark" />
                      <span className="text-[10px] font-bold text-cb-terracotta-dark">
                        {slotProgress[index]}%
                      </span>
                    </div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={img.url} alt="" className="aspect-square w-full object-cover" />
                  )}
                  <div className="flex items-center justify-between gap-1 border-t border-cb-border/60 bg-cb-surface/80 p-1.5">
                    <div className="flex gap-0.5">
                      <button
                        type="button"
                        disabled={!canWrite || index === 0 || uploading}
                        onClick={() => move(index, -1)}
                        className="rounded-md p-1 text-cb-text-muted hover:bg-cb-peach disabled:opacity-30"
                        aria-label="تحريك"
                      >
                        <GripVertical className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={!canWrite || uploading}
                        onClick={() => removeAt(index)}
                        className="rounded-md p-1 text-red-600 hover:bg-red-50"
                        aria-label="حذف"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <label
                      className={cn(
                        "text-[10px] font-bold text-cb-terracotta-dark",
                        (!canWrite || uploading) && "pointer-events-none opacity-40",
                      )}
                    >
                      استبدال
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={!canWrite || uploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) startImageUpload(f, index);
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
              if (f) uploadFilesToSlots([f], "video");
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

"use client";

import { useCallback, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Trash2, Video } from "lucide-react";
import { MAX_PRODUCT_IMAGES } from "@/lib/products/media";
import type { ProductImageFormItem } from "@/lib/admin/products-dashboard-types";
import { cn } from "@/lib/utils";

type Props = {
  images: ProductImageFormItem[];
  videoUrl: string;
  canWrite: boolean;
  onImagesChange: (images: ProductImageFormItem[]) => void;
  onVideoUrlChange: (url: string) => void;
  onLegacyImageUrlChange?: (url: string) => void;
};

async function uploadMedia(
  file: File,
  kind: "image" | "video",
): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("kind", kind);
  const res = await fetch("/api/admin/products/upload-media", { method: "POST", body: fd });
  const data = (await res.json().catch(() => null)) as
    | {
        image?: { url?: string };
        video?: { url?: string };
        error?: { en?: string };
      }
    | null;
  if (!res.ok) throw new Error(data?.error?.en || "فشل الرفع");
  const url = kind === "image" ? data?.image?.url : data?.video?.url;
  if (!url) throw new Error("فشل الرفع");
  return url;
}

export function ProductMediaEditor({
  images,
  videoUrl,
  canWrite,
  onImagesChange,
  onVideoUrlChange,
  onLegacyImageUrlChange,
}: Props) {
  const [uploadingSlot, setUploadingSlot] = useState<number | "video" | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const filledCount = images.filter((img) => img.url.trim()).length;

  const setImageAt = useCallback(
    (index: number, patch: Partial<ProductImageFormItem>) => {
      const next = [...images];
      while (next.length < MAX_PRODUCT_IMAGES) {
        next.push({ url: "", alt_en: "", alt_ar: "" });
      }
      next[index] = { ...next[index], ...patch };
      onImagesChange(next.slice(0, MAX_PRODUCT_IMAGES));
      const primary = next.find((x) => x.url.trim())?.url.trim() ?? "";
      onLegacyImageUrlChange?.(primary);
    },
    [images, onImagesChange, onLegacyImageUrlChange],
  );

  const addEmptySlot = useCallback(() => {
    if (filledCount >= MAX_PRODUCT_IMAGES) return;
    const next = [...images];
    while (next.length < MAX_PRODUCT_IMAGES && next.some((x) => !x.url.trim())) {
      /* wait */
    }
    if (next.length < MAX_PRODUCT_IMAGES) {
      next.push({ url: "", alt_en: "", alt_ar: "" });
    }
    onImagesChange(next.slice(0, MAX_PRODUCT_IMAGES));
  }, [filledCount, images, onImagesChange]);

  const removeAt = useCallback(
    (index: number) => {
      const next = images.filter((_, i) => i !== index);
      while (next.length < 1) next.push({ url: "", alt_en: "", alt_ar: "" });
      onImagesChange(next);
      const primary = next.find((x) => x.url.trim())?.url.trim() ?? "";
      onLegacyImageUrlChange?.(primary);
    },
    [images, onImagesChange, onLegacyImageUrlChange],
  );

  const move = useCallback(
    (index: number, dir: -1 | 1) => {
      const next = [...images];
      const target = index + dir;
      if (target < 0 || target >= next.length) return;
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      onImagesChange(next);
    },
    [images, onImagesChange],
  );

  const handleUpload = useCallback(
    async (index: number, file: File | null) => {
      if (!file || !canWrite) return;
      setUploadingSlot(index);
      setUploadError(null);
      try {
        const url = await uploadMedia(file, "image");
        setImageAt(index, { url });
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : "فشل رفع الصورة");
      } finally {
        setUploadingSlot(null);
      }
    },
    [canWrite, setImageAt],
  );

  const handleVideoUpload = useCallback(
    async (file: File | null) => {
      if (!file || !canWrite) return;
      setUploadingSlot("video");
      setUploadError(null);
      try {
        const url = await uploadMedia(file, "video");
        onVideoUrlChange(url);
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : "فشل رفع الفيديو");
      } finally {
        setUploadingSlot(null);
      }
    },
    [canWrite, onVideoUrlChange],
  );

  const slots =
    images.length > 0
      ? images.slice(0, MAX_PRODUCT_IMAGES)
      : [{ url: "", alt_en: "", alt_ar: "" }];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-cb-text-muted">
          صور المنتج ({filledCount}/{MAX_PRODUCT_IMAGES})
        </p>
        <p className="mt-1 text-[11px] text-cb-text-muted">
          ارفع حتى 5 صور — تظهر كسلايدر في صفحة المنتج. الصورة الأولى هي الرئيسية.
        </p>
      </div>

      <div className="space-y-3">
        {slots.map((img, index) => (
          <div
            key={`img-slot-${index}`}
            className="rounded-xl border border-cb-border bg-cb-surface/40 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-cb-text-muted">صورة {index + 1}</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={!canWrite || index === 0}
                  onClick={() => move(index, -1)}
                  className="rounded-lg border border-cb-border p-1.5 disabled:opacity-40"
                  aria-label="تحريك لأعلى"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={!canWrite || index >= slots.length - 1}
                  onClick={() => move(index, 1)}
                  className="rounded-lg border border-cb-border p-1.5 disabled:opacity-40"
                  aria-label="تحريك لأسفل"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={!canWrite}
                  onClick={() => removeAt(index)}
                  className="rounded-lg border border-red-200 p-1.5 text-red-700 disabled:opacity-40"
                  aria-label="حذف"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                className="rounded-xl border border-cb-border bg-cb-surface-elevated px-3 py-2 text-sm"
                placeholder="https://..."
                value={img.url}
                disabled={!canWrite}
                onChange={(e) => setImageAt(index, { url: e.target.value })}
              />
              <label
                className={cn(
                  "inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-cb-border px-3 py-2 text-sm font-semibold",
                  !canWrite && "cursor-not-allowed opacity-50",
                )}
              >
                <ImagePlus className="h-4 w-4" aria-hidden />
                {uploadingSlot === index ? "جاري الرفع…" : "رفع"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  disabled={!canWrite || uploadingSlot !== null}
                  onChange={(e) => {
                    void handleUpload(index, e.target.files?.[0] ?? null);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <input
                className="rounded-lg border border-cb-border bg-cb-surface-elevated px-2 py-1.5 text-xs"
                placeholder="Alt EN"
                value={img.alt_en}
                disabled={!canWrite}
                onChange={(e) => setImageAt(index, { alt_en: e.target.value })}
              />
              <input
                className="rounded-lg border border-cb-border bg-cb-surface-elevated px-2 py-1.5 text-xs"
                placeholder="Alt AR"
                value={img.alt_ar}
                disabled={!canWrite}
                onChange={(e) => setImageAt(index, { alt_ar: e.target.value })}
              />
            </div>
            {img.url.trim() ? (
              <div className="mt-2 overflow-hidden rounded-lg border border-cb-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-28 w-full object-cover" />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {filledCount < MAX_PRODUCT_IMAGES ? (
        <button
          type="button"
          disabled={!canWrite}
          onClick={addEmptySlot}
          className="w-full rounded-xl border border-dashed border-cb-border py-2 text-sm font-semibold text-cb-text-muted hover:bg-cb-surface-2 disabled:opacity-50"
        >
          + إضافة صورة ({filledCount}/{MAX_PRODUCT_IMAGES})
        </button>
      ) : null}

      <div className="rounded-xl border border-cb-border bg-cb-surface/50 p-3">
        <p className="flex items-center gap-1 text-xs font-semibold text-cb-text-muted">
          <Video className="h-4 w-4" aria-hidden />
          فيديو المنتج (اختياري)
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            className="rounded-xl border border-cb-border bg-cb-surface-elevated px-3 py-2 text-sm"
            placeholder="https://...mp4"
            value={videoUrl}
            disabled={!canWrite}
            onChange={(e) => onVideoUrlChange(e.target.value)}
          />
          <label
            className={cn(
              "inline-flex cursor-pointer items-center justify-center rounded-xl border border-cb-border px-4 py-2 text-sm font-semibold",
              !canWrite && "cursor-not-allowed opacity-50",
            )}
          >
            {uploadingSlot === "video" ? "جاري الرفع…" : "رفع فيديو"}
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
              disabled={!canWrite || uploadingSlot !== null}
              onChange={(e) => {
                void handleVideoUpload(e.target.files?.[0] ?? null);
                e.currentTarget.value = "";
              }}
            />
          </label>
        </div>
        {videoUrl.trim() ? (
          <video
            src={videoUrl}
            controls
            playsInline
            preload="metadata"
            className="mt-3 max-h-40 w-full rounded-lg border border-cb-border bg-black"
          />
        ) : null}
      </div>

      {uploadError ? <p className="text-xs text-red-600">{uploadError}</p> : null}
    </div>
  );
}

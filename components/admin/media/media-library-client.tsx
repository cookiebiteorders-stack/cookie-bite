"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Copy,
  ExternalLink,
  ImagePlus,
  Loader2,
  RefreshCw,
  Upload,
  Video,
} from "lucide-react";
import { fetchJson } from "@/lib/http/fetch-json";
import { cn } from "@/lib/utils";

type MediaItem = {
  id: string;
  url: string;
  publicId?: string;
  kind: "image" | "video";
  format: string;
  bytes: number;
  createdAt: string;
  folder: string;
  usedBy: Array<{ id: string; name: string; slug: string }>;
  source: "cloudinary" | "catalog";
};

type LibraryResponse = {
  configured: boolean;
  items: MediaItem[];
  productOnlyCount: number;
};

function formatBytes(n: number): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaLibraryClient() {
  const [data, setData] = useState<LibraryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<"all" | "image" | "video">("all");
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchJson<LibraryResponse>("/api/admin/media");
      setData(res);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "فشل التحميل");
      setData({ configured: false, items: [], productOnlyCount: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const items =
    data?.items.filter((i) => filter === "all" || i.kind === filter) ?? [];

  const onUpload = async (file: File, kind: "image" | "video") => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      const res = await fetch("/api/admin/media", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.ar ?? json?.error?.en ?? "فشل الرفع");
      }
      setToast("تم الرفع بنجاح");
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setToast("تم نسخ الرابط");
    } catch {
      setToast("تعذّر النسخ");
    }
  };

  return (
    <section className="space-y-6 pb-16">
      <div className="admin-panel-surface rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-900/90">
              Media
            </p>
            <h1 className="mt-1 font-serif text-2xl font-bold text-cb-text-strong">
              مكتبة الوسائط
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-cb-text-muted">
              عرض كل الملفات المرفوعة على Cloudinary (مجلد{" "}
              <code className="rounded bg-cb-surface-2 px-1 text-xs">cookie-bite/</code>
              ) وصور المنتجات المرتبطة. الرفع من هنا أو من{" "}
              <Link href="/admin/products" className="font-semibold text-cb-terracotta-dark underline">
                المنتجات
              </Link>
              .
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="admin-btn-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden />
              تحديث
            </button>
            <button
              type="button"
              disabled={uploading || !data?.configured}
              onClick={() => fileRef.current?.click()}
              className="admin-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Upload className="h-4 w-4" aria-hidden />
              )}
              رفع ملف
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                const kind = f.type.startsWith("video/") ? "video" : "image";
                void onUpload(f, kind);
              }}
            />
          </div>
        </div>

        {!data?.configured ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Cloudinary غير مضبوط — أضف{" "}
            <code className="text-xs">NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME</code> و{" "}
            <code className="text-xs">CLOUDINARY_API_KEY</code> و{" "}
            <code className="text-xs">CLOUDINARY_API_SECRET</code> في `.env`. حتى ذلك الحين
            تُعرض روابط الصور المخزّنة على المنتجات فقط.
          </p>
        ) : null}

        {data && data.productOnlyCount > 0 ? (
          <p className="mt-3 text-xs text-cb-text-muted">
            {data.productOnlyCount} رابط مستخدم في منتجات وغير ظاهر في قائمة Cloudinary (روابط
            خارجية أو قديمة).
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {(["all", "image", "video"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-bold capitalize",
                filter === f
                  ? "bg-cb-brand-100 text-cb-brand-900"
                  : "bg-cb-surface text-cb-text-muted",
              )}
            >
              {f === "all" ? "الكل" : f === "image" ? "صور" : "فيديو"}
            </button>
          ))}
          <span className="self-center text-xs text-cb-text-muted">
            {items.length} عنصر
          </span>
        </div>
      </div>

      {toast ? (
        <p className="rounded-xl border border-cb-border bg-cb-brand-50 px-4 py-2 text-sm font-semibold text-cb-brand-900">
          {toast}
          <button type="button" className="ms-2 underline" onClick={() => setToast(null)}>
            إغلاق
          </button>
        </p>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-cb-brand-600" aria-hidden />
        </div>
      ) : items.length === 0 ? (
        <div className="admin-panel-surface flex flex-col items-center gap-3 rounded-2xl py-16 text-center">
          <ImagePlus className="h-12 w-12 text-cb-text-muted" aria-hidden />
          <p className="text-sm font-semibold text-cb-text-strong">لا توجد وسائط بعد</p>
          <p className="max-w-md text-xs text-cb-text-muted">
            ارفع صوراً من زر «رفع ملف» أو من صفحة منتج — ستظهر هنا تلقائياً بعد التحديث.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <article
              key={item.id}
              className="admin-panel-surface overflow-hidden rounded-2xl border border-cb-border shadow-sm"
            >
              <div className="relative aspect-square bg-cb-peach/30">
                {item.kind === "video" ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
                    <Video className="h-10 w-10 text-cb-terracotta-dark" aria-hidden />
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-cb-brand-700 underline"
                    >
                      فتح الفيديو
                    </a>
                  </div>
                ) : (
                  <Image
                    src={item.url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width:768px) 50vw, 25vw"
                    unoptimized={!item.url.includes("res.cloudinary.com")}
                  />
                )}
                <span className="absolute start-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                  {item.kind}
                </span>
              </div>
              <div className="space-y-2 p-3 text-xs">
                <p className="truncate font-mono text-[10px] text-cb-text-muted" title={item.url}>
                  {item.publicId || item.url}
                </p>
                <p className="text-cb-text-muted">
                  {formatBytes(item.bytes)} · {item.format}
                </p>
                {item.usedBy.length > 0 ? (
                  <ul className="space-y-0.5">
                    {item.usedBy.slice(0, 2).map((p) => (
                      <li key={p.id}>
                        <Link
                          href={`/admin/products`}
                          className="font-semibold text-cb-terracotta-dark hover:underline"
                        >
                          {p.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-amber-800/90">غير مربوط بمنتج</p>
                )}
                <div className="flex gap-1 pt-1">
                  <button
                    type="button"
                    onClick={() => void copyUrl(item.url)}
                    className="admin-btn-secondary inline-flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 font-bold"
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                    نسخ
                  </button>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="admin-btn-secondary inline-flex items-center justify-center rounded-lg px-2 py-1.5"
                    aria-label="فتح"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

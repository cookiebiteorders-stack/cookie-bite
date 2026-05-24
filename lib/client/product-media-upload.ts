"use client";

import { compressImageFileForUpload } from "@/lib/client/compress-image-file";
import { fetchJson } from "@/lib/http/fetch-json";
import {
  EMPTY_PRODUCT_IMAGE_SLOT,
  type ProductImageFormItem,
} from "@/lib/admin/products-dashboard-types";
import { MAX_PRODUCT_IMAGES } from "@/lib/products/media";
import { useProductsDashboardStore } from "@/stores/products-dashboard-store";

export type ProductMediaUploadKind = "image" | "video";

type SignedUpload = {
  apiKey: string;
  timestamp: string;
  signature: string;
  folder: string;
  uploadUrl: string;
  kind: ProductMediaUploadKind;
};

type UploadProgress = (pct: number) => void;

function networkErrorMessage(err: unknown): string {
  if (err instanceof DOMException && err.name === "AbortError") {
    return "انتهت مهلة الرفع — جرّب صورة أصغر أو اتصالاً أسرع";
  }
  const msg = err instanceof Error ? err.message : "";
  if (/failed to fetch|networkerror|load failed/i.test(msg)) {
    return "تعذّر الاتصال بالخادم — تحقق من الشبكة أو حجم الصورة";
  }
  return msg || "فشل الرفع";
}

async function fetchSignedUpload(kind: ProductMediaUploadKind): Promise<SignedUpload | null> {
  try {
    const data = await fetchJson<{ ok?: boolean; upload?: SignedUpload }>(
      "/api/admin/products/upload-media/sign",
      { method: "POST", jsonBody: { kind }, timeoutMs: 15_000 },
    );
    return data.upload ?? null;
  } catch {
    return null;
  }
}

function uploadViaXhr(
  file: File,
  signed: SignedUpload,
  onProgress?: UploadProgress,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", signed.uploadUrl);
    xhr.timeout = 180_000;

    xhr.upload.onprogress = (ev) => {
      if (!ev.lengthComputable || !onProgress) return;
      onProgress(Math.min(99, Math.round((ev.loaded / ev.total) * 100)));
    };

    xhr.onload = () => {
      type CloudinaryUploadResponse = {
        secure_url?: string;
        error?: { message?: string };
      };
      let json: CloudinaryUploadResponse | null = null;
      try {
        json = JSON.parse(xhr.responseText) as CloudinaryUploadResponse;
      } catch {
        json = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && json?.secure_url) {
        onProgress?.(100);
        resolve(json.secure_url);
        return;
      }
      reject(new Error(json?.error?.message || `فشل الرفع (${xhr.status})`));
    };

    xhr.onerror = () => reject(new Error("تعذّر الاتصال بـ Cloudinary"));
    xhr.ontimeout = () => reject(new Error("انتهت مهلة الرفع"));

    const body = new FormData();
    body.append("file", file);
    body.append("api_key", signed.apiKey);
    body.append("timestamp", signed.timestamp);
    body.append("signature", signed.signature);
    body.append("folder", signed.folder);
    if (signed.kind === "video") body.append("resource_type", "video");
    xhr.send(body);
  });
}

async function uploadViaApiRoute(file: File, kind: ProductMediaUploadKind): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("kind", kind);
  const res = await fetch("/api/admin/products/upload-media", {
    method: "POST",
    body: fd,
    signal: AbortSignal.timeout(180_000),
  });
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

export async function uploadProductMediaFile(
  file: File,
  kind: ProductMediaUploadKind,
  onProgress?: UploadProgress,
): Promise<string> {
  const prepared =
    kind === "image" ? await compressImageFileForUpload(file).catch(() => file) : file;

  onProgress?.(2);
  const signed = await fetchSignedUpload(kind);
  onProgress?.(5);

  try {
    if (signed) {
      return await uploadViaXhr(prepared, signed, onProgress);
    }
    onProgress?.(10);
    const url = await uploadViaApiRoute(prepared, kind);
    onProgress?.(100);
    return url;
  } catch (err) {
    if (signed) {
      try {
        onProgress?.(15);
        const url = await uploadViaApiRoute(prepared, kind);
        onProgress?.(100);
        return url;
      } catch (fallbackErr) {
        throw new Error(networkErrorMessage(fallbackErr));
      }
    }
    throw new Error(networkErrorMessage(err));
  }
}

// ——— طابور رفع يستمر بعد إغلاق النموذج ———

type PatchContext = {
  productId: string;
  baseImages: ProductImageFormItem[];
};

type QueueJob = {
  id: string;
  file: File;
  kind: ProductMediaUploadKind;
  onProgress?: UploadProgress;
  onSuccess: (url: string) => void;
  onError: (message: string) => void;
};

let patchContext: PatchContext | null = null;
const queue: QueueJob[] = [];
let active = 0;
const MAX_CONCURRENT = 2;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribeProductMediaUploads(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getProductMediaUploadBusyCount(): number {
  return active + queue.length;
}

export function setProductMediaPatchContext(ctx: PatchContext | null) {
  patchContext = ctx;
}

async function patchProductImages(productId: string, images: ProductImageFormItem[]) {
  const payload = images
    .map((img, order) => ({
      url: img.url.trim(),
      alt_en: img.alt_en.trim() || null,
      alt_ar: img.alt_ar.trim() || null,
      order,
    }))
    .filter((img) => img.url);

  await fetchJson("/api/admin/products", {
    method: "PATCH",
    jsonBody: {
      ids: [productId],
      patch: {
        images: payload,
        image_url: payload[0]?.url ?? null,
      },
    },
    timeoutMs: 30_000,
  });
}

function mergeImageUrl(base: ProductImageFormItem[], url: string): ProductImageFormItem[] {
  if (base.some((x) => x.url.trim() === url)) return base;
  const emptyIdx = base.findIndex((x) => !x.url.trim());
  if (emptyIdx >= 0) {
    const next = [...base];
    next[emptyIdx] = { ...next[emptyIdx], url };
    return next;
  }
  if (base.length >= MAX_PRODUCT_IMAGES) return base;
  return [...base, { ...EMPTY_PRODUCT_IMAGE_SLOT, url }];
}

async function runJob(job: QueueJob) {
  active += 1;
  emit();
  try {
    const url = await uploadProductMediaFile(job.file, job.kind, job.onProgress);
    job.onSuccess(url);

    if (patchContext && job.kind === "image") {
      const merged = mergeImageUrl(patchContext.baseImages, url);
      patchContext = { ...patchContext, baseImages: merged };
      await patchProductImages(patchContext.productId, merged);
      void useProductsDashboardStore.getState().loadProducts();
    }
  } catch (e) {
    job.onError(e instanceof Error ? e.message : "فشل الرفع");
  } finally {
    active -= 1;
    emit();
    drainQueue();
  }
}

function drainQueue() {
  while (active < MAX_CONCURRENT && queue.length > 0) {
    const job = queue.shift();
    if (job) void runJob(job);
  }
}

export function enqueueProductMediaUpload(job: Omit<QueueJob, "id"> & { id?: string }) {
  const entry: QueueJob = { ...job, id: job.id ?? crypto.randomUUID() };
  queue.push(entry);
  emit();
  drainQueue();
  return entry.id;
}

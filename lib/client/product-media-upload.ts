"use client";

import { compressImageFileForUpload } from "@/lib/client/compress-image-file";
import {
  fetchSignedCloudinaryUpload,
  uploadFileToCloudinarySigned,
  type UploadProgress,
} from "@/lib/client/cloudinary-signed-upload";
import { fetchJson } from "@/lib/http/fetch-json";
import type { ProductMediaUploadKind } from "@/lib/client/product-media-upload-types";
import { useProductsDashboardStore } from "@/stores/products-dashboard-store";

export type { ProductMediaUploadKind } from "@/lib/client/product-media-upload-types";

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

export function productMediaUploadFolder(
  productId: string | null | undefined,
  kind: ProductMediaUploadKind,
): string {
  if (!productId) {
    return kind === "video" ? "cookie-bite/products/_pending/videos" : "cookie-bite/products/_pending";
  }
  return kind === "video"
    ? `cookie-bite/products/${productId}/videos`
    : `cookie-bite/products/${productId}`;
}

async function uploadViaApiRoute(
  file: File,
  kind: ProductMediaUploadKind,
  folder?: string,
): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("kind", kind);
  if (folder) fd.append("folder", folder);
  const res = await fetch("/api/admin/products/upload-media", {
    method: "POST",
    body: fd,
    signal: AbortSignal.timeout(240_000),
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
  opts?: { onProgress?: UploadProgress; productId?: string | null; folder?: string },
): Promise<string> {
  const folder = opts?.folder ?? productMediaUploadFolder(opts?.productId, kind);
  const prepared =
    kind === "image" ? await compressImageFileForUpload(file).catch(() => file) : file;

  opts?.onProgress?.(2);
  const signed = await fetchSignedCloudinaryUpload({
    kind,
    signPath: "/api/admin/products/upload-media/sign",
    folder,
  });
  opts?.onProgress?.(5);

  try {
    if (signed) {
      return await uploadFileToCloudinarySigned(prepared, signed, opts?.onProgress);
    }
    opts?.onProgress?.(10);
    const url = await uploadViaApiRoute(prepared, kind, folder);
    opts?.onProgress?.(100);
    return url;
  } catch (err) {
    if (signed) {
      try {
        opts?.onProgress?.(15);
        const url = await uploadViaApiRoute(prepared, kind, folder);
        opts?.onProgress?.(100);
        return url;
      } catch (fallbackErr) {
        throw new Error(networkErrorMessage(fallbackErr));
      }
    }
    throw new Error(networkErrorMessage(err));
  }
}

async function appendProductMediaOnServer(
  productId: string,
  kind: ProductMediaUploadKind,
  url: string,
): Promise<void> {
  await fetchJson(`/api/admin/products/${productId}/media`, {
    method: "POST",
    jsonBody: { kind, url },
    timeoutMs: 30_000,
  });
  void useProductsDashboardStore.getState().loadProducts();
}

// ——— طابور رفع — كل job مربوط بمنتج محدد (لا سياق عام) ———

type QueueJob = {
  id: string;
  productId: string | null;
  file: File;
  kind: ProductMediaUploadKind;
  onProgress?: UploadProgress;
  onSuccess: (url: string) => void;
  onError: (message: string) => void;
};

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

/** بعد إنشاء منتج جديد — اربط الرفعات المعلّقة (بدون productId) بالمنتج المحفوظ. */
export function bindPendingUploadsToProduct(productId: string) {
  const trimmed = productId.trim();
  if (!trimmed) return;
  for (const job of queue) {
    if (!job.productId) job.productId = trimmed;
  }
}

async function runJob(job: QueueJob) {
  active += 1;
  emit();
  try {
    const url = await uploadProductMediaFile(job.file, job.kind, {
      productId: job.productId,
      onProgress: job.onProgress,
    });
    job.onSuccess(url);

    const productId = job.productId?.trim();
    if (productId) {
      await appendProductMediaOnServer(productId, job.kind, url);
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

export function enqueueProductMediaUpload(
  job: Omit<QueueJob, "id" | "productId"> & { id?: string; productId?: string | null },
) {
  const entry: QueueJob = {
    ...job,
    id: job.id ?? crypto.randomUUID(),
    productId: job.productId?.trim() || null,
  };
  queue.push(entry);
  emit();
  drainQueue();
  return entry.id;
}

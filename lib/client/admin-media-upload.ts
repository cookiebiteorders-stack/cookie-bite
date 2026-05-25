import { compressImageFileForUpload } from "@/lib/client/compress-image-file";
import {
  fetchSignedCloudinaryUpload,
  uploadFileToCloudinarySigned,
  type UploadProgress,
} from "@/lib/client/cloudinary-signed-upload";
import type { CloudinaryUploadKind } from "@/lib/cloudinary/admin-upload";

function networkErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  if (/failed to fetch|networkerror|load failed/i.test(msg)) {
    return "تعذّر الاتصال — تحقق من الشبكة أو جرّب صورة أصغر";
  }
  return msg || "فشل الرفع";
}

async function uploadViaApiRoute(
  file: File,
  kind: CloudinaryUploadKind,
  action?: "replace",
  extra?: Record<string, string>,
): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("kind", kind);
  if (action) fd.append("action", action);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) fd.append(k, v);
  }
  const res = await fetch("/api/admin/media", {
    method: action === "replace" ? "PATCH" : "POST",
    body: fd,
    signal: AbortSignal.timeout(240_000),
  });
  const data = (await res.json().catch(() => null)) as
    | {
        asset?: { url?: string };
        image?: { url?: string };
        error?: { en?: string; ar?: string };
      }
    | null;
  if (!res.ok) {
    throw new Error(data?.error?.ar || data?.error?.en || "فشل الرفع");
  }
  const url = data?.asset?.url ?? data?.image?.url;
  if (!url) throw new Error("فشل الرفع — لم يُرجَع رابط");
  return url;
}

export async function uploadAdminMediaFile(
  file: File,
  kind: CloudinaryUploadKind,
  onProgress?: UploadProgress,
): Promise<string> {
  const folder =
    kind === "image" ? "cookie-bite/media" : "cookie-bite/media/videos";
  const prepared =
    kind === "image"
      ? await compressImageFileForUpload(file).catch(() => file)
      : file;

  onProgress?.(2);
  const signed = await fetchSignedCloudinaryUpload({
    kind,
    signPath: "/api/admin/media/sign",
    folder,
  });
  onProgress?.(5);

  try {
    if (signed) {
      return await uploadFileToCloudinarySigned(prepared, signed, onProgress);
    }
    onProgress?.(10);
    const url = await uploadViaApiRoute(prepared, kind);
    onProgress?.(100);
    return url;
  } catch (err) {
    if (signed) {
      try {
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

export async function replaceAdminMediaFile(
  file: File,
  kind: CloudinaryUploadKind,
  meta: { url: string; publicId?: string },
  onProgress?: UploadProgress,
): Promise<string> {
  const prepared =
    kind === "image"
      ? await compressImageFileForUpload(file).catch(() => file)
      : file;

  onProgress?.(10);
  const extra: Record<string, string> = {
    url: meta.url,
    kind,
    updateProducts: "true",
  };
  if (meta.publicId) extra.publicId = meta.publicId;
  const url = await uploadViaApiRoute(prepared, kind, "replace", extra);
  onProgress?.(100);
  return url;
}

import { fetchJson } from "@/lib/http/fetch-json";
import type { CloudinaryUploadKind } from "@/lib/cloudinary/admin-upload";

export type SignedCloudinaryUpload = {
  apiKey: string;
  timestamp: string;
  signature: string;
  folder: string;
  uploadUrl: string;
  kind: CloudinaryUploadKind;
};

export type UploadProgress = (pct: number) => void;

export async function fetchSignedCloudinaryUpload(opts: {
  kind: CloudinaryUploadKind;
  signPath: string;
  folder?: string;
}): Promise<SignedCloudinaryUpload | null> {
  try {
    const data = await fetchJson<{ ok?: boolean; upload?: SignedCloudinaryUpload }>(
      opts.signPath,
      {
        method: "POST",
        jsonBody: { kind: opts.kind, folder: opts.folder },
        timeoutMs: 15_000,
      },
    );
    return data.upload ?? null;
  } catch {
    return null;
  }
}

export function uploadFileToCloudinarySigned(
  file: File,
  signed: SignedCloudinaryUpload,
  onProgress?: UploadProgress,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", signed.uploadUrl);
    xhr.timeout = 240_000;

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

import {
  cloudinaryConfig,
  cloudinarySignature,
  type CloudinaryUploadKind,
  uploadToCloudinary,
} from "@/lib/cloudinary/admin-upload";

function adminAuthHeader() {
  const cfg = cloudinaryConfig();
  if (!cfg) return null;
  const token = Buffer.from(`${cfg.apiKey}:${cfg.apiSecret}`).toString("base64");
  return { cfg, authorization: `Basic ${token}` };
}

/** Remove an asset from Cloudinary (upload type). */
export async function destroyCloudinaryAsset(
  publicId: string,
  kind: CloudinaryUploadKind,
): Promise<void> {
  const cfg = cloudinaryConfig();
  if (!cfg) throw new Error("Cloudinary is not configured");
  if (!publicId.trim()) throw new Error("public_id is required");

  const timestamp = String(Math.floor(Date.now() / 1000));
  const signedParams = { public_id: publicId, timestamp };
  const signature = cloudinarySignature(signedParams, cfg.apiSecret);
  const body = new URLSearchParams({
    public_id: publicId,
    timestamp,
    api_key: cfg.apiKey,
    signature,
  });

  const endpoint =
    kind === "video"
      ? `https://api.cloudinary.com/v1_1/${cfg.cloudName}/video/destroy`
      : `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/destroy`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(20_000),
  });

  const json = (await res.json().catch(() => null)) as { result?: string; error?: { message?: string } } | null;
  if (!res.ok || json?.result !== "ok") {
    throw new Error(json?.error?.message || `Cloudinary destroy failed (${res.status})`);
  }
}

/** Replace file in-place (same public_id, new bytes). */
export async function replaceCloudinaryAsset(
  file: File,
  publicId: string,
  kind: CloudinaryUploadKind,
): Promise<{ url: string; public_id: string | null; bytes: number | null }> {
  return uploadToCloudinary(file, kind, { publicId, overwrite: true });
}

/** Rename public_id (updates URL). Returns new secure URL when available. */
export async function renameCloudinaryAsset(
  fromPublicId: string,
  toPublicId: string,
  kind: CloudinaryUploadKind,
): Promise<{ url: string; public_id: string }> {
  const auth = adminAuthHeader();
  if (!auth) throw new Error("Cloudinary is not configured");

  const resourceType = kind === "video" ? "video" : "image";
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${auth.cfg.cloudName}/resources/${resourceType}/upload/rename`,
    {
      method: "POST",
      headers: {
        Authorization: auth.authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from_public_id: fromPublicId,
        to_public_id: toPublicId,
      }),
      signal: AbortSignal.timeout(20_000),
    },
  );

  const json = (await res.json().catch(() => null)) as
    | { secure_url?: string; public_id?: string; error?: { message?: string } }
    | null;

  if (!res.ok || !json?.public_id) {
    throw new Error(json?.error?.message || `Cloudinary rename failed (${res.status})`);
  }

  return {
    url: json.secure_url ?? buildCloudinaryUrl(auth.cfg.cloudName, json.public_id, kind),
    public_id: json.public_id,
  };
}

function buildCloudinaryUrl(cloudName: string, publicId: string, kind: CloudinaryUploadKind): string {
  const type = kind === "video" ? "video" : "image";
  return `https://res.cloudinary.com/${cloudName}/${type}/upload/${publicId.replace(/\//g, "/")}`;
}

import { cloudinaryConfig } from "@/lib/cloudinary/admin-upload";

export type CloudinaryAsset = {
  id: string;
  url: string;
  publicId: string;
  kind: "image" | "video";
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  createdAt: string;
  folder: string;
};

type CloudinaryResource = {
  public_id: string;
  secure_url: string;
  bytes?: number;
  format?: string;
  width?: number;
  height?: number;
  created_at?: string;
  resource_type?: string;
};

async function fetchResourcePage(
  resourceType: "image" | "video",
  opts?: { maxResults?: number; nextCursor?: string },
): Promise<{ items: CloudinaryAsset[]; nextCursor?: string }> {
  const cfg = cloudinaryConfig();
  if (!cfg) return { items: [] };

  const maxResults = Math.min(100, opts?.maxResults ?? 100);
  const params = new URLSearchParams({
    type: "upload",
    prefix: "cookie-bite",
    max_results: String(maxResults),
  });
  if (opts?.nextCursor) params.set("next_cursor", opts.nextCursor);

  const auth = Buffer.from(`${cfg.apiKey}:${cfg.apiSecret}`).toString("base64");
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cfg.cloudName}/resources/${resourceType}?${params}`,
    {
      headers: { Authorization: `Basic ${auth}` },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    },
  );

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(err || `Cloudinary list failed (${res.status})`);
  }

  const json = (await res.json()) as {
    resources?: CloudinaryResource[];
    next_cursor?: string;
  };
  const items = (json.resources ?? []).map((r) => ({
    id: r.public_id,
    publicId: r.public_id,
    url: r.secure_url,
    kind: resourceType,
    format: r.format ?? resourceType,
    bytes: r.bytes ?? 0,
    width: r.width,
    height: r.height,
    createdAt: r.created_at ?? new Date().toISOString(),
    folder: r.public_id.includes("/") ? r.public_id.split("/").slice(0, -1).join("/") : "",
  }));

  return { items, nextCursor: json.next_cursor };
}

async function fetchAllResourcePages(
  resourceType: "image" | "video",
  maxTotal: number,
): Promise<CloudinaryAsset[]> {
  const all: CloudinaryAsset[] = [];
  let nextCursor: string | undefined;

  while (all.length < maxTotal) {
    const page = await fetchResourcePage(resourceType, {
      maxResults: Math.min(100, maxTotal - all.length),
      nextCursor,
    });
    all.push(...page.items);
    nextCursor = page.nextCursor;
    if (!nextCursor || page.items.length === 0) break;
  }

  return all;
}

/** List uploaded assets under prefix `cookie-bite/` from Cloudinary. */
export async function listCloudinaryAssets(opts?: {
  maxPerType?: number;
}): Promise<{ configured: boolean; items: CloudinaryAsset[] }> {
  const cfg = cloudinaryConfig();
  if (!cfg) return { configured: false, items: [] };

  const cap = opts?.maxPerType ?? 80;
  const [images, videos] = await Promise.all([
    fetchAllResourcePages("image", cap),
    fetchAllResourcePages("video", Math.min(40, cap)),
  ]);

  const items = [...images, ...videos].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return { configured: true, items };
}

const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

/** Paginated listing for orphan cleanup (up to ~2000 assets per type). */
export async function listAllCloudinaryAssets(opts?: {
  maxPerType?: number;
}): Promise<{ configured: boolean; items: CloudinaryAsset[] }> {
  const cfg = cloudinaryConfig();
  if (!cfg) return { configured: false, items: [] };

  const cap = opts?.maxPerType ?? 2000;
  const [images, videos] = await Promise.all([
    fetchAllResourcePages("image", cap),
    fetchAllResourcePages("video", Math.min(500, cap)),
  ]);

  const items = [...images, ...videos].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return { configured: true, items };
}

export { FIFTEEN_DAYS_MS };

import { runMrBrownieGemini } from "@/lib/mr-brownie/gemini";
import {
  cloudinaryConfig,
  cloudinarySignature,
  uploadToCloudinary,
} from "@/lib/cloudinary/admin-upload";
import { extractJsonObject } from "@/lib/admin/json-from-model";
import { MAX_PRODUCT_IMAGES } from "@/lib/products/media";

export type ProductCopyInput = {
  name?: string;
  title_en?: string;
  title_ar?: string;
  description_en?: string;
  description_ar?: string;
  ingredients?: string;
};

export type ImprovedProductCopy = {
  name?: string;
  title_en?: string;
  title_ar?: string;
  description_en?: string;
  description_ar?: string;
  ingredients?: string;
};

export type ProductImageSource = "generated" | "unsplash" | "stock" | "remote";

export type ProductImageCandidate = {
  url: string;
  source: ProductImageSource;
  alt_en: string;
  alt_ar: string;
};

export type ProductImageAssistMode = "both" | "generate" | "search";

const UNSPLASH_SEARCH_COUNT = 4;

const STOCK_COOKIE_IMAGES = [
  "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1602351447937-745cb720612f?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=1200&q=85",
];

function strField(json: Record<string, unknown>, key: string, max: number): string | undefined {
  const v = json[key];
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t.slice(0, max) : undefined;
}

function sanitizeImprovedCopy(json: Record<string, unknown>): ImprovedProductCopy {
  const out: ImprovedProductCopy = {
    name: strField(json, "name", 200),
    title_en: strField(json, "title_en", 200),
    title_ar: strField(json, "title_ar", 200),
    description_en: strField(json, "description_en", 3000),
    description_ar: strField(json, "description_ar", 3000),
    ingredients: strField(json, "ingredients", 500),
  };

  if (out.title_en && /[\u0600-\u06FF]/.test(out.title_en)) delete out.title_en;
  if (out.title_ar && /[a-zA-Z]/.test(out.title_ar)) delete out.title_ar;

  return out;
}

function hasAnyCopy(input: ProductCopyInput): boolean {
  return Object.values(input).some((v) => typeof v === "string" && v.trim().length > 0);
}

const IMPROVE_SYSTEM = `You are a senior copy editor for Cookie Bite — a premium bakery in Egypt.
Your job is to POLISH existing text only. You must NOT rewrite the product concept or invent new flavors, ingredients, quantities, or claims.

Rules:
- Preserve the exact product identity, flavors, ingredient items, and factual details.
- Fix grammar, flow, punctuation, and appetizing premium tone.
- Do NOT shorten dramatically or expand into a different product.
- name: improve display name only; keep the same language mix (Arabic/English) as the input.
- title_en: English ONLY — zero Arabic characters.
- title_ar: Arabic ONLY — zero Latin letters (a-z A-Z).
- description_en / description_ar: keep the same language; improve readability only.
- ingredients: improve clarity and comma formatting; keep the same ingredient list.
- If a field is empty in the input, return an empty string for that field.
- Return ONLY valid JSON (no markdown) with keys: name, title_en, title_ar, description_en, description_ar, ingredients`;

export async function improveProductCopyWithAi(
  input: ProductCopyInput,
): Promise<{ fields: ImprovedProductCopy; source: "ai" | "none" }> {
  if (!hasAnyCopy(input)) {
    return { fields: {}, source: "none" };
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const payload = JSON.stringify(
    {
      name: input.name?.trim() ?? "",
      title_en: input.title_en?.trim() ?? "",
      title_ar: input.title_ar?.trim() ?? "",
      description_en: input.description_en?.trim() ?? "",
      description_ar: input.description_ar?.trim() ?? "",
      ingredients: input.ingredients?.trim() ?? "",
    },
    null,
    2,
  );

  const raw = await runMrBrownieGemini({
    systemInstruction: IMPROVE_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Polish these product fields. Improve writing only — same product, same facts:\n${payload}`,
      },
    ],
    temperature: 0.25,
    maxOutputTokens: 2048,
  });

  const json = extractJsonObject(raw);
  if (!json) {
    throw new Error("Could not parse AI copy response");
  }

  return { fields: sanitizeImprovedCopy(json), source: "ai" };
}

async function buildImagePlan(context: {
  name: string;
  description_en?: string;
  description_ar?: string;
  category?: string;
}): Promise<{ generation_prompt: string; search_query: string; stock_index: number }> {
  const raw = await runMrBrownieGemini({
    systemInstruction: `You plan product photography for Cookie Bite bakery e-commerce.
Return ONLY valid JSON with:
- generation_prompt: detailed English prompt for photorealistic food photography (single hero product, warm studio light, shallow depth, no text/watermarks/logos)
- search_query: 3-6 English keywords for stock photo search (cookies, brownies, gift box, etc.)
- stock_index: integer 0-${STOCK_COOKIE_IMAGES.length - 1} — best matching curated cookie photo when generation/search fails`,
    messages: [
      {
        role: "user",
        content: `Product name: ${context.name}
Category: ${context.category?.trim() || "general"}
Description EN: ${context.description_en?.trim() || "n/a"}
Description AR: ${context.description_ar?.trim() || "n/a"}`,
      },
    ],
    temperature: 0.4,
    maxOutputTokens: 512,
  });

  const json = extractJsonObject(raw);
  const generation_prompt =
    typeof json?.generation_prompt === "string" && json.generation_prompt.trim()
      ? json.generation_prompt.trim().slice(0, 1200)
      : `Professional food photography of ${context.name}, luxury bakery cookie, warm lighting, no text`;

  const search_query =
    typeof json?.search_query === "string" && json.search_query.trim()
      ? json.search_query.trim().slice(0, 120)
      : `gourmet cookies ${context.name}`;

  let stock_index = 0;
  if (typeof json?.stock_index === "number" && Number.isFinite(json.stock_index)) {
    stock_index = Math.max(0, Math.min(STOCK_COOKIE_IMAGES.length - 1, Math.floor(json.stock_index)));
  }

  return { generation_prompt, search_query, stock_index };
}

function productImageGeminiModels(): string[] {
  const configured = process.env.PRODUCT_IMAGE_GEMINI_MODEL?.trim();
  const defaults = [
    "gemini-2.0-flash-preview-image-generation",
    "gemini-2.0-flash-exp-image-generation",
  ];
  return configured ? [configured, ...defaults.filter((m) => m !== configured)] : defaults;
}

function extractImageBufferFromGeminiResponse(json: {
  candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }>;
} | null): Buffer | null {
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const data = part.inlineData?.data;
    if (data) return Buffer.from(data, "base64");
  }
  return null;
}

async function generateImageBufferWithGemini(prompt: string): Promise<Buffer | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  for (const model of productImageGeminiModels()) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
      },
    );

    const json = (await res.json().catch(() => null)) as {
      candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }>;
      error?: { message?: string };
    } | null;

    if (!res.ok) {
      console.warn(
        `[product-ai-assist] image generation failed (${model}):`,
        json?.error?.message ?? res.status,
      );
      continue;
    }

    const buffer = extractImageBufferFromGeminiResponse(json);
    if (buffer) return buffer;
  }

  return null;
}

async function searchUnsplashImages(query: string, limit = UNSPLASH_SEARCH_COUNT): Promise<string[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!key) return [];

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(Math.max(1, Math.min(limit, 10))));
  url.searchParams.set("orientation", "squarish");
  url.searchParams.set("content_filter", "high");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
  });

  const json = (await res.json().catch(() => null)) as {
    results?: Array<{ urls?: { regular?: string } }>;
  } | null;

  if (!res.ok || !json?.results?.length) return [];

  const seen = new Set<string>();
  const urls: string[] = [];
  for (const row of json.results) {
    const regular = row.urls?.regular?.trim();
    if (!regular) continue;
    const dedupeKey = regular.split("?")[0] ?? regular;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    urls.push(regular);
  }
  return urls;
}

function dedupeImageUrl(url: string): string {
  return url.split("?")[0] ?? url;
}

async function pushUploadedCandidate(
  candidates: ProductImageCandidate[],
  seen: Set<string>,
  item: ProductImageCandidate,
): Promise<void> {
  const key = dedupeImageUrl(item.url);
  if (seen.has(key)) return;
  seen.add(key);
  candidates.push(item);
}

async function addStockFallbacks(
  candidates: ProductImageCandidate[],
  seen: Set<string>,
  stockIndex: number,
  alt_en: string,
  alt_ar: string,
  maxCount: number,
): Promise<void> {
  const indices = [
    stockIndex,
    (stockIndex + 1) % STOCK_COOKIE_IMAGES.length,
    (stockIndex + 2) % STOCK_COOKIE_IMAGES.length,
    (stockIndex + 3) % STOCK_COOKIE_IMAGES.length,
  ];

  for (const idx of indices) {
    if (candidates.length >= maxCount) break;
    const stockUrl = STOCK_COOKIE_IMAGES[idx];
    if (!stockUrl || seen.has(dedupeImageUrl(stockUrl))) continue;

    try {
      const uploaded = await uploadRemoteUrlToCloudinary(stockUrl);
      await pushUploadedCandidate(candidates, seen, {
        url: uploaded.url,
        source: "stock",
        alt_en,
        alt_ar,
      });
    } catch {
      await pushUploadedCandidate(candidates, seen, {
        url: stockUrl,
        source: "remote",
        alt_en,
        alt_ar,
      });
    }
  }
}

async function uploadBufferToCloudinary(
  buffer: Buffer,
  mimeType: string,
): Promise<{ url: string }> {
  const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
  const file = new File([blob], `product-ai-${Date.now()}.jpg`, { type: mimeType });
  const result = await uploadToCloudinary(file, "image", { folder: "cookie-bite/products/ai" });
  return { url: result.url };
}

export async function uploadRemoteUrlToCloudinary(
  remoteUrl: string,
  opts?: { folder?: string },
): Promise<{ url: string }> {
  const cfg = cloudinaryConfig();
  if (!cfg) throw new Error("Cloudinary is not configured");

  const timestamp = String(Math.floor(Date.now() / 1000));
  const folder = opts?.folder ?? "cookie-bite/products/ai";
  const signedParams: Record<string, string> = { timestamp, folder };
  const signature = cloudinarySignature(signedParams, cfg.apiSecret);

  const uploadBody = new FormData();
  uploadBody.append("file", remoteUrl);
  uploadBody.append("timestamp", timestamp);
  uploadBody.append("api_key", cfg.apiKey);
  uploadBody.append("signature", signature);
  uploadBody.append("folder", folder);

  const cloudRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`,
    { method: "POST", body: uploadBody },
  );

  const cloudJson = (await cloudRes.json().catch(() => null)) as
    | { secure_url?: string; error?: { message?: string } }
    | null;

  if (!cloudRes.ok || !cloudJson?.secure_url) {
    throw new Error(cloudJson?.error?.message || "Cloudinary fetch upload failed");
  }

  return { url: cloudJson.secure_url };
}

export async function resolveProductImagesWithAi(
  context: {
    name: string;
    description_en?: string;
    description_ar?: string;
    category?: string;
    title_en?: string;
  },
  mode: ProductImageAssistMode = "both",
): Promise<ProductImageCandidate[]> {
  const name = context.name.trim();
  if (name.length < 2) {
    throw new Error("Product name is required for image assist");
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const plan = await buildImagePlan(context);
  const alt_en = context.title_en?.trim() || name;
  const alt_ar = name;
  const maxCount = MAX_PRODUCT_IMAGES;
  const candidates: ProductImageCandidate[] = [];
  const seen = new Set<string>();

  const wantGenerate = mode === "both" || mode === "generate";
  const wantSearch = mode === "both" || mode === "search";

  const [generated, unsplashUrls] = await Promise.all([
    wantGenerate ? generateImageBufferWithGemini(plan.generation_prompt) : Promise.resolve(null),
    wantSearch ? searchUnsplashImages(plan.search_query, UNSPLASH_SEARCH_COUNT) : Promise.resolve([]),
  ]);

  if (generated) {
    try {
      const uploaded = await uploadBufferToCloudinary(generated, "image/jpeg");
      await pushUploadedCandidate(candidates, seen, {
        url: uploaded.url,
        source: "generated",
        alt_en,
        alt_ar,
      });
    } catch (e) {
      console.warn("[product-ai-assist] generated image upload failed:", e);
    }
  }

  for (const unsplashUrl of unsplashUrls) {
    if (candidates.length >= maxCount) break;
    try {
      const uploaded = await uploadRemoteUrlToCloudinary(unsplashUrl);
      await pushUploadedCandidate(candidates, seen, {
        url: uploaded.url,
        source: "unsplash",
        alt_en,
        alt_ar,
      });
    } catch {
      await pushUploadedCandidate(candidates, seen, {
        url: unsplashUrl,
        source: "remote",
        alt_en,
        alt_ar,
      });
    }
  }

  if (candidates.length === 0) {
    await addStockFallbacks(candidates, seen, plan.stock_index, alt_en, alt_ar, maxCount);
  } else if (wantSearch && candidates.length < maxCount) {
    await addStockFallbacks(
      candidates,
      seen,
      plan.stock_index,
      alt_en,
      alt_ar,
      Math.min(maxCount, candidates.length + 2),
    );
  }

  if (candidates.length === 0) {
    throw new Error("Could not resolve any product images");
  }

  return candidates.slice(0, maxCount);
}

export async function resolveProductImageWithAi(context: {
  name: string;
  description_en?: string;
  description_ar?: string;
  category?: string;
  title_en?: string;
}): Promise<ProductImageCandidate> {
  const images = await resolveProductImagesWithAi(context, "both");
  return images[0]!;
}

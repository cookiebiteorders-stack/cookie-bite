/**
 * توليد صور المنتجات فقط — يستخدم GEMINI_IMAGE_GENERATION_* (مفتاح/موديل/مشروع منفصل).
 * لا يُستخدم لـ Mr. Brownie أو تحسين النصوص.
 */

const IMAGE_MODEL_DEFAULTS = [
  "gemini-2.5-flash-image",
  "gemini-2.0-flash-preview-image-generation",
  "gemini-2.0-flash-exp-image-generation",
  "gemini-3-pro-image-preview",
] as const;

export type ProductImageGenerationProvider = "dedicated" | "fallback";

export function isProductImageGenerationConfigured(): boolean {
  return Boolean(resolveDedicatedImageApiKey());
}

function resolveDedicatedImageApiKey(): string | null {
  return process.env.GEMINI_IMAGE_GENERATION_API_KEY?.trim() || null;
}

function resolveFallbackImageApiKey(): string | null {
  return process.env.GEMINI_API_KEY?.trim() || null;
}

function productImageModels(): string[] {
  const configured = process.env.GEMINI_IMAGE_GENERATION_MODEL?.trim();
  if (!configured) return [...IMAGE_MODEL_DEFAULTS];
  return [configured, ...IMAGE_MODEL_DEFAULTS.filter((m) => m !== configured)];
}

type GeminiImageResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ inlineData?: { data?: string } }> };
  }>;
};

function extractImageBufferFromGeminiResponse(json: GeminiImageResponse | null): Buffer | null {
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const data = part.inlineData?.data;
    if (data) return Buffer.from(data, "base64");
  }
  return null;
}

async function callGeminiImageGenerate(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<Buffer | null> {
  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
  );
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: { aspectRatio: "1:1" },
      },
    }),
    signal: AbortSignal.timeout(120_000),
  });

  const json = (await res.json().catch(() => null)) as {
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }>;
    error?: { message?: string };
  } | null;

  if (!res.ok) {
    console.warn(
      `[product-image-generation] ${model} failed:`,
      json?.error?.message ?? res.status,
    );
    return null;
  }

  return extractImageBufferFromGeminiResponse(json);
}

/**
 * يولّد صورة منتج من الـ prompt. يفضّل مفتاح GEMINI_IMAGE_GENERATION_API_KEY.
 */
export async function generateProductImageBuffer(
  prompt: string,
): Promise<{ buffer: Buffer | null; provider: ProductImageGenerationProvider | null }> {
  const dedicatedKey = resolveDedicatedImageApiKey();
  const fallbackKey = resolveFallbackImageApiKey();
  const apiKey = dedicatedKey ?? fallbackKey;
  if (!apiKey) {
    return { buffer: null, provider: null };
  }

  const provider: ProductImageGenerationProvider = dedicatedKey ? "dedicated" : "fallback";
  const models = dedicatedKey
    ? productImageModels()
    : [
        process.env.PRODUCT_IMAGE_GEMINI_MODEL?.trim(),
        ...IMAGE_MODEL_DEFAULTS,
      ].filter((m): m is string => Boolean(m?.trim()));

  for (const model of models) {
    const buffer = await callGeminiImageGenerate(apiKey, model, prompt);
    if (buffer) return { buffer, provider };
  }

  return { buffer: null, provider };
}

export function getProductImageGenerationStatus(): {
  configured: boolean;
  model: string | null;
  projectId: string | null;
  provider: ProductImageGenerationProvider | null;
} {
  const dedicated = Boolean(resolveDedicatedImageApiKey());
  return {
    configured: dedicated || Boolean(resolveFallbackImageApiKey()),
    model: process.env.GEMINI_IMAGE_GENERATION_MODEL?.trim() || null,
    projectId:
      process.env.GEMINI_IMAGE_GENERATION_PROJECT_ID?.trim() ||
      process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
      null,
    provider: dedicated ? "dedicated" : resolveFallbackImageApiKey() ? "fallback" : null,
  };
}

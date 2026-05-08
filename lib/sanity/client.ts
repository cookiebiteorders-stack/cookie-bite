import { createClient, type SanityClient } from "@sanity/client";

let _client: SanityClient | null = null;

/**
 * عميل Sanity للقراءة فقط (CDN). يتطلب NEXT_PUBLIC_SANITY_PROJECT_ID.
 * استدعِ فقط عند الحاجة؛ إن لم تُضبط البيئة سترمي createSanityClient خطأ عند أول استخدام.
 */
export function createSanityClient(): SanityClient {
  if (_client) return _client;
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
  if (!projectId) {
    throw new Error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID");
  }
  _client = createClient({
    projectId,
    dataset,
    apiVersion: "2024-01-01",
    useCdn: true,
  });
  return _client;
}

/** يعيد عميلاً جاهزاً أو `null` إذا لم يُعرّف المشروع (بدون رمي). */
export function getSanityClient(): SanityClient | null {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) return null;
  return createSanityClient();
}

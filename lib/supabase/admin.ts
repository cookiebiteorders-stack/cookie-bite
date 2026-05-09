import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const adminOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
} as const;

function createServiceRoleClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, adminOptions);
}

/**
 * عميل الخدمة إن وُجدت المتغيرات؛ وإلا `null` (مثلاً صفحة الحساب تبقى تعمل بدون قاعدة).
 */
export function tryCreateSupabaseAdminClient(): SupabaseClient | null {
  return createServiceRoleClient();
}

/**
 * عميل بصلاحية الخدمة — للاستخدام في Route Handlers / Server Actions فقط.
 * لا تستورد هذا الملف من مكوّنات العميل.
 * يُفضّل استدعاء `tryCreateSupabaseAdminClient` في المسارات التي يجب ألا تنهار بدون DB.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  const client = createServiceRoleClient();
  if (!client) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY");
  }
  return client;
}

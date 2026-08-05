import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const adminOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
  db: {
    schema: "public",
  },
  global: {
    headers: {
      "x-client-info": "cookie-bite-admin",
    },
  },
  // Connection timeout to prevent hanging connections under load
  connectTimeout: 10000, // 10 seconds
} as const;

function createServiceRoleClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  
  // Configure connection settings for better scalability
  // These settings help manage database connections more efficiently under load
  const options = { 
    ...adminOptions,
    // Add connection timeout to prevent hanging connections
    connectTimeout: 10000, // 10 seconds
  };
  
  return createClient(url, serviceKey, options);
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
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY)",
    );
  }
  return client;
}

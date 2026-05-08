import { createClient } from "@supabase/supabase-js";

/**
 * عميل بصلاحية الخدمة — للاستخدام في Route Handlers / Server Actions فقط.
 * لا تستورد هذا الملف من مكوّنات العميل.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

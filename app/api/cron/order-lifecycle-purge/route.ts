import { NextRequest, NextResponse } from "next/server";
import { verifyInternalSecret } from "@/lib/auth/verify-internal";
import { purgeExpiredOrderLifecycleEvents } from "@/lib/orders/order-lifecycle";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bilingualError } from "@/lib/validations";

/**
 * POST /api/cron/order-lifecycle-purge
 * Schedule: daily — removes order_lifecycle_events where expires_at <= now().
 */
export async function POST(req: NextRequest) {
  if (!verifyInternalSecret(req)) {
    return NextResponse.json(bilingualError("Forbidden", "ممنوع"), { status: 403 });
  }

  const supabase = createSupabaseAdminClient();
  const result = await purgeExpiredOrderLifecycleEvents(supabase);

  return NextResponse.json({
    ok: true,
    deleted: result.deleted,
    retention_days: 30,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { verifyInternalSecret } from "@/lib/auth/verify-internal";
import { processAbandonedCartReminders } from "@/lib/cart/abandoned-reminders";
import { bilingualError } from "@/lib/validations";

/**
 * POST /api/cron/abandoned-cart-reminders
 * Schedule: hourly (Hostinger cron) with x-internal-secret header.
 */
export async function POST(req: NextRequest) {
  if (!verifyInternalSecret(req)) {
    return NextResponse.json(bilingualError("Forbidden", "ممنوع"), { status: 403 });
  }

  const result = await processAbandonedCartReminders();

  return NextResponse.json({
    ok: true,
    processed: result,
  });
}

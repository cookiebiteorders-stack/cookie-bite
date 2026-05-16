import { NextRequest, NextResponse } from "next/server";
import { verifyInternalSecret } from "@/lib/auth/verify-internal";
import { drainBullNotificationJobs } from "@/lib/notifications/bull-queue";
import { processPendingNotificationJobs } from "@/lib/notifications/schedule";
import { bilingualError } from "@/lib/validations";

/**
 * POST /api/cron/notification-jobs
 * Hostinger cron or internal scheduler — processes DB queue and/or Bull (Redis).
 */
export async function POST(req: NextRequest) {
  if (!verifyInternalSecret(req)) {
    return NextResponse.json(bilingualError("Forbidden", "ممنوع"), { status: 403 });
  }

  const limit = Math.min(50, Number(req.nextUrl.searchParams.get("limit") ?? 10) || 10);
  const [dbDone, bullDone] = await Promise.all([
    processPendingNotificationJobs(limit),
    drainBullNotificationJobs(limit),
  ]);

  return NextResponse.json({
    ok: true,
    processed: { database: dbDone, bull: bullDone },
  });
}

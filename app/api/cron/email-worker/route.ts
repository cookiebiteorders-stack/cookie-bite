import { NextRequest, NextResponse } from "next/server";
import { verifyInternalSecret } from "@/lib/auth/verify-internal";
import { drainEmailBullJobs } from "@/lib/email/automation/bull-queue";
import { drainEmailQueue } from "@/lib/email/automation/pipeline";
import { requeueFailedEmails } from "@/lib/email/automation/self-heal";
import { bilingualError } from "@/lib/validations";

/**
 * POST /api/cron/email-worker
 * Process email queue (DB + BullMQ) and retry failed rows.
 */
export async function POST(req: NextRequest) {
  if (!verifyInternalSecret(req)) {
    return NextResponse.json(bilingualError("Forbidden", "ممنوع"), { status: 403 });
  }

  const limit = Math.min(50, Number(req.nextUrl.searchParams.get("limit") ?? 25) || 25);
  const [dbDone, bullDone, requeued] = await Promise.all([
    drainEmailQueue(limit),
    drainEmailBullJobs(limit),
    requeueFailedEmails(Math.floor(limit / 2)),
  ]);

  return NextResponse.json({
    ok: true,
    processed: { database: dbDone, bull: bullDone, requeued },
  });
}

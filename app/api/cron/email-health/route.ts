import { NextRequest, NextResponse } from "next/server";
import { verifyInternalSecret } from "@/lib/auth/verify-internal";
import { runSelfHealCycle } from "@/lib/email/automation/self-heal";
import { bilingualError } from "@/lib/validations";

/**
 * POST /api/cron/email-health
 * Provider health checks, test send, auto-fallback, queue drain.
 * Schedule: every 5–10 minutes (Hostinger cron).
 */
export async function POST(req: NextRequest) {
  if (!verifyInternalSecret(req)) {
    return NextResponse.json(bilingualError("Forbidden", "ممنوع"), { status: 403 });
  }

  const result = await runSelfHealCycle();
  return NextResponse.json({ ok: true, ...result });
}

import { NextRequest, NextResponse } from "next/server";
import { verifyInternalSecret } from "@/lib/auth/verify-internal";
import { buildMrBrownieWeeklyReport } from "@/lib/mr-brownie/admin/weekly-report";
import { bilingualError } from "@/lib/validations";

/**
 * POST /api/cron/mr-brownie-weekly-report
 * Schedule: weekly (Hostinger cron) with x-internal-secret header.
 */
export async function POST(req: NextRequest) {
  if (!verifyInternalSecret(req)) {
    return NextResponse.json(bilingualError("Forbidden", "ممنوع"), { status: 403 });
  }

  const report = await buildMrBrownieWeeklyReport(7);
  if (!report) {
    return NextResponse.json(
      bilingualError("Report failed", "فشل التقرير"),
      { status: 503 },
    );
  }

  console.info("[mr-brownie-weekly-report]", JSON.stringify(report.summary));

  return NextResponse.json({ ok: true, summary: report.summary });
}

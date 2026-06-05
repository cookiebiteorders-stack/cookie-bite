import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { buildMrBrownieWeeklyReport } from "@/lib/mr-brownie/admin/weekly-report";
import { bilingualError } from "@/lib/validations";

export async function GET(req: NextRequest) {
  await requireAdminAccess("analytics");

  const raw = req.nextUrl.searchParams.get("days");
  const days = raw ? Number(raw) : 7;
  const period = Number.isFinite(days) ? Math.min(30, Math.max(7, Math.floor(days))) : 7;

  const report = await buildMrBrownieWeeklyReport(period);
  if (!report) {
    return NextResponse.json(
      bilingualError("Report unavailable", "التقرير غير متاح"),
      { status: 503 },
    );
  }

  return NextResponse.json({ report });
}

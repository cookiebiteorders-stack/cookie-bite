import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { fetchMrBrownieAnalytics } from "@/lib/mr-brownie/brain/analytics";
import { bilingualError } from "@/lib/validations";

export async function GET(req: NextRequest) {
  await requireAdminAccess("analytics");

  const raw = req.nextUrl.searchParams.get("days");
  const days = raw ? Number(raw) : 30;
  const period = Number.isFinite(days) ? Math.min(90, Math.max(7, Math.floor(days))) : 30;

  const snapshot = await fetchMrBrownieAnalytics(period);
  if (!snapshot) {
    return NextResponse.json(
      bilingualError("Analytics unavailable", "التحليلات غير متاحة — تحقق من Supabase والـ migrations"),
      { status: 503 },
    );
  }

  return NextResponse.json(snapshot);
}

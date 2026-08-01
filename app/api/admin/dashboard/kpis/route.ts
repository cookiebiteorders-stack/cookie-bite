import { NextResponse } from "next/server";
import { loadAdminDashboardKpis } from "@/lib/admin/dashboard-kpis";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";

export const dynamic = "force-dynamic";
export const revalidate = 60; // Cache KPIs for 60 seconds

export async function GET() {
  try {
    await requireAdminAccess("dashboard");
  } catch (res) {
    if (res instanceof Response) return res;
    throw res;
  }

  try {
    const kpis = await loadAdminDashboardKpis();
    return NextResponse.json({ ok: true, kpis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load KPIs";
    return NextResponse.json(
      bilingualError("Could not load dashboard KPIs", "تعذّر تحميل مؤشرات لوحة التحكم"),
      { status: 500, headers: { "x-error-detail": message } },
    );
  }
}

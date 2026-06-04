import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { getAutomationStatus } from "@/lib/admin/automation/status";
import { bilingualError } from "@/lib/validations";

export async function GET() {
  await requireAdminAccess("settings");
  try {
    const status = await getAutomationStatus();
    return NextResponse.json({ ok: true, ...status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "status_failed";
    return NextResponse.json(bilingualError(msg, msg), { status: 500 });
  }
}

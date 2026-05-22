import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { listImportHistory } from "@/lib/admin/import-export/import-service";
import { parseModuleParam } from "@/lib/admin/import-export/api-helpers";
import { bilingualError } from "@/lib/validations";

export async function GET(req: NextRequest) {
  await requireAdminAccess("dashboard");
  const url = new URL(req.url);
  const mod = url.searchParams.get("module");
  const moduleKey = mod ? parseModuleParam(mod) : null;
  if (mod && !moduleKey) {
    return NextResponse.json(bilingualError("Unknown module", "وحدة غير معروفة"), { status: 404 });
  }
  try {
    const rows = await listImportHistory(moduleKey ?? undefined);
    return NextResponse.json({ ok: true, rows });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json(bilingualError(msg, msg), { status: 500 });
  }
}

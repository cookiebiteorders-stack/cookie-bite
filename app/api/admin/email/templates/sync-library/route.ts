import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { syncNotificationLibraryToEmailTemplates } from "@/lib/email/automation/sync-template-library";

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("settings");
  requireWritePermission(actor);
  const result = await syncNotificationLibraryToEmailTemplates();

  return NextResponse.json({
    ok: true,
    synced: result.synced,
    total_templates: result.totalTemplates,
    skipped: result.skipped,
  });
}

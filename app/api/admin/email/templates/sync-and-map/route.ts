import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncNotificationLibraryToEmailTemplates } from "@/lib/email/automation/sync-template-library";

const DEFAULT_EVENT_MAPPINGS = [
  { event_name: "user_registered", template_key: "welcome" },
  { event_name: "order_created", template_key: "order-confirmed" },
  { event_name: "order_shipped", template_key: "order-shipped" },
  { event_name: "password_reset", template_key: "password-reset" },
] as const;

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("settings");
  requireWritePermission(actor);

  const sync = await syncNotificationLibraryToEmailTemplates();
  const supabase = createSupabaseAdminClient();

  const mappings: Array<{ event_name: string; template_key: string; is_active: boolean }> = [];
  const skippedMappings: Array<{ event_name: string; template_key: string; reason: string }> = [];

  for (const item of DEFAULT_EVENT_MAPPINGS) {
    const { data: activeTemplate, error } = await supabase
      .from("email_templates")
      .select("id")
      .eq("key", item.template_key)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (error || !activeTemplate?.id) {
      skippedMappings.push({
        event_name: item.event_name,
        template_key: item.template_key,
        reason: error?.message ?? "template_not_found_or_inactive",
      });
      continue;
    }

    mappings.push({
      event_name: item.event_name,
      template_key: item.template_key,
      is_active: true,
    });
  }

  if (mappings.length > 0) {
    const { error } = await supabase
      .from("email_event_template_mappings")
      .upsert(mappings, { onConflict: "event_name" });
    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: "mapping_upsert_failed",
          message: error.message,
          sync,
          attempted_mappings: mappings,
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    sync: {
      synced: sync.synced,
      total_templates: sync.totalTemplates,
      skipped: sync.skipped,
    },
    mapped: mappings.length,
    mappings,
    skipped_mappings: skippedMappings,
  });
}

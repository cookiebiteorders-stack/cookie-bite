import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listTemplates, renderTemplate } from "@/lib/notification-library";
import { extractTemplateVariables } from "@/lib/email/automation/template-renderer";

type DbCategory =
  | "transactional"
  | "marketing"
  | "otp"
  | "invoice"
  | "notification"
  | "system";

function mapCategory(input: string): DbCategory {
  if (input === "transactional") return "transactional";
  if (input === "marketing" || input === "retention") return "marketing";
  if (input === "security" || input === "lifecycle") return "notification";
  return "system";
}

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("settings");
  requireWritePermission(actor);

  const supabase = createSupabaseAdminClient();
  const metas = listTemplates();
  let synced = 0;
  const skipped: Array<{ key: string; reason: string }> = [];

  for (const meta of metas) {
    for (const lang of ["en", "ar"] as const) {
      const rendered = renderTemplate(meta.key, meta.sampleVars, { lang });
      if (!rendered) {
        skipped.push({ key: `${meta.key}:${lang}`, reason: "render_failed" });
        continue;
      }

      const variables = Array.from(
        new Set([
          ...Object.keys(meta.sampleVars ?? {}),
          ...extractTemplateVariables(rendered.html),
        ]),
      );

      const { error } = await supabase.from("email_templates").upsert(
        {
          key: meta.key,
          name: meta.name,
          category: mapCategory(meta.category),
          subject: rendered.subject,
          html_body: rendered.html,
          variables,
          language: lang,
          is_active: true,
        },
        { onConflict: "key,language" },
      );

      if (error) {
        skipped.push({ key: `${meta.key}:${lang}`, reason: error.message });
        continue;
      }
      synced += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    synced,
    total_templates: metas.length,
    skipped,
  });
}

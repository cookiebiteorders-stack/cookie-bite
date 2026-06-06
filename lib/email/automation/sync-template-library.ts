import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listTemplates, renderTemplate } from "@/lib/notification-library";
import { extractTemplateVariables } from "@/lib/email/automation/template-renderer";
import { PERSONAL_OR_CONTEXT_VARS } from "@/lib/email/automation/template-default-vars";

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

/** Keep {{placeholders}} for per-recipient fields; bake static sample values only. */
function buildSyncVars(
  sampleVars: Record<string, string | number | undefined | null>,
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(sampleVars ?? {})) {
    if (PERSONAL_OR_CONTEXT_VARS.has(key)) {
      out[key] = `{{${key}}}`;
      continue;
    }
    if (typeof value === "string" || typeof value === "number") {
      out[key] = value;
    }
  }
  return out;
}

export async function syncNotificationLibraryToEmailTemplates() {
  const supabase = createSupabaseAdminClient();
  const metas = listTemplates();
  let synced = 0;
  const skipped: Array<{ key: string; reason: string }> = [];

  for (const meta of metas) {
    for (const lang of ["en", "ar"] as const) {
      const rendered = renderTemplate(meta.key, buildSyncVars(meta.sampleVars ?? {}), {
        lang,
      });
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

  return {
    synced,
    totalTemplates: metas.length,
    skipped,
  };
}

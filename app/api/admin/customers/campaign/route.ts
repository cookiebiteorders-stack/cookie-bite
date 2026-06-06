import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bilingualError } from "@/lib/validations";
import { renderTemplate } from "@/lib/notification-library";
import { resolveRecipientTemplateVars } from "@/lib/notification-library/resolve-recipient-vars";
import { renderTemplateContent } from "@/lib/email/automation/template-renderer";
import { sendInternalEmail } from "@/lib/email/send";
import { isEmailConfigured } from "@/lib/email/resend";

const MAX_RECIPIENTS = 80;

const bodySchema = z.object({
  templateKey: z.string().min(1).max(120),
  source: z.enum(["library", "db"]).default("library"),
  lang: z.enum(["en", "ar"]).optional().default("ar"),
  scope: z.enum(["page", "all"]).default("page"),
  emails: z.array(z.string().email()).max(MAX_RECIPIENTS).optional(),
  vars: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

async function resolveRendered(
  source: "library" | "db",
  templateKey: string,
  lang: "en" | "ar",
  vars: Record<string, string | number>,
): Promise<{ subject: string; html: string } | null> {
  if (source === "library") {
    const rendered = renderTemplate(templateKey, vars, { lang });
    if (!rendered) return null;
    return { subject: rendered.subject, html: rendered.html };
  }

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("email_templates")
    .select("subject,html_body")
    .eq("key", templateKey)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!data?.html_body) return null;
  const stringVars: Record<string, string | number> = vars;
  return {
    subject: renderTemplateContent(String(data.subject ?? ""), stringVars),
    html: renderTemplateContent(String(data.html_body), stringVars),
  };
}

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("customers");
  requireWritePermission(actor);

  if (!isEmailConfigured()) {
    return NextResponse.json(
      bilingualError(
        "Email provider not configured (RESEND_API_KEY)",
        "مزوّد البريد غير مفعّل — أضف RESEND_API_KEY",
      ),
      { status: 503 },
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid payload", "بيانات غير صالحة"), { status: 400 });
  }

  let recipients = [...new Set((parsed.data.emails ?? []).map((e) => e.toLowerCase()))];

  if (recipients.length === 0 && parsed.data.scope === "all") {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("users")
      .select("email")
      .eq("role", "customer")
      .order("created_at", { ascending: false })
      .limit(MAX_RECIPIENTS);
    recipients = [...new Set((data ?? []).map((r) => String(r.email).toLowerCase()).filter(Boolean))];
  }

  if (!recipients.length) {
    return NextResponse.json(
      bilingualError("No recipients", "لا يوجد مستلمون — اختر عملاء أو أضف عناوين"),
      { status: 400 },
    );
  }

  if (recipients.length > MAX_RECIPIENTS) {
    recipients = recipients.slice(0, MAX_RECIPIENTS);
  }

  const baseVars = parsed.data.vars ?? {};
  const templateShell = await resolveRendered(
    parsed.data.source,
    parsed.data.templateKey,
    parsed.data.lang,
    baseVars,
  );

  if (!templateShell) {
    return NextResponse.json(
      bilingualError("Template not found", "القالب غير موجود أو غير نشط"),
      { status: 404 },
    );
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const to of recipients) {
    try {
      const recipientVars = await resolveRecipientTemplateVars(to);
      const mergedVars = { ...recipientVars, ...baseVars };
      const subject =
        parsed.data.source === "db"
          ? renderTemplateContent(templateShell.subject, mergedVars)
          : (
              renderTemplate(parsed.data.templateKey, mergedVars, {
                lang: parsed.data.lang,
              })?.subject ?? templateShell.subject
            );
      const html =
        parsed.data.source === "db"
          ? renderTemplateContent(templateShell.html, mergedVars)
          : (renderTemplate(parsed.data.templateKey, mergedVars, {
              lang: parsed.data.lang,
            })?.html ?? templateShell.html);

      await sendInternalEmail({
        to,
        subject,
        html,
        emailType: "marketing",
        templateKey: parsed.data.templateKey,
        immediate: true,
      });
      sent += 1;
      await new Promise((r) => setTimeout(r, 120));
    } catch (e) {
      failed += 1;
      if (errors.length < 5) {
        errors.push(e instanceof Error ? e.message : "send_failed");
      }
    }
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "customers.campaign_send",
    module: "customers",
    entity_id: parsed.data.templateKey,
    metadata: {
      source: parsed.data.source,
      scope: parsed.data.scope,
      sent,
      failed,
      recipients: recipients.length,
    },
    request: req,
  });

  return NextResponse.json({
    ok: failed === 0,
    sent,
    failed,
    total: recipients.length,
    errors: errors.length ? errors : undefined,
    message: {
      ar: `تم إرسال ${sent} من ${recipients.length} رسالة.`,
      en: `Sent ${sent} of ${recipients.length} messages.`,
    },
  });
}

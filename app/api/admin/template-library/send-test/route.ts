import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireAdminAccess,
  requireWritePermission,
} from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { renderTemplate } from "@/lib/notification-library";
import { EMAIL_CONFIG, getResend } from "@/lib/email/resend";
import { bilingualError } from "@/lib/validations";

const schema = z.object({
  key: z.string().min(1),
  to: z.string().email(),
  lang: z.enum(["en", "ar"]).optional(),
  vars: z
    .record(z.string(), z.union([z.string(), z.number()]))
    .optional(),
});

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("templates");
  requireWritePermission(actor);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid payload", "بيانات غير صالحة"),
      { status: 400 },
    );
  }

  const rendered = renderTemplate(parsed.data.key, parsed.data.vars ?? {}, {
    lang: parsed.data.lang,
  });
  if (!rendered) {
    return NextResponse.json(
      bilingualError(
        `Template "${parsed.data.key}" not found`,
        `القالب "${parsed.data.key}" غير موجود`,
      ),
      { status: 404 },
    );
  }

  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: parsed.data.to,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `[TEST] ${rendered.subject}`,
      html: rendered.html,
    });

    await writeAuditLog({
      actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
      action: "templates.send_test",
      module: "templates",
      entity_id: parsed.data.key,
      after: { to: parsed.data.to, key: parsed.data.key },
      request: req,
    });

    return NextResponse.json({
      ok: true,
      result: { id: result.data?.id ?? null },
    });
  } catch (error) {
    console.error("[template-library/send-test] Resend error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        ...bilingualError(
          "Failed to send test email",
          "فشل إرسال البريد التجريبي",
        ),
        debug: process.env.NODE_ENV === "development" ? { message } : undefined,
      },
      { status: 500 },
    );
  }
}

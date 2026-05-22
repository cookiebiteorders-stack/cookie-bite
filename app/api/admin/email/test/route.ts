import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { sendAutomatedEmailNow } from "@/lib/email/automation/pipeline";
import { runFullHealthCycle } from "@/lib/email/automation/health-monitor";
import { bilingualError } from "@/lib/validations";

const bodySchema = z.object({
  to: z.string().email(),
  subject: z.string().max(200).optional(),
  runHealth: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("settings");
  requireWritePermission(actor);
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid email", "بريد غير صالح"), { status: 400 });
  }

  const health = parsed.data.runHealth ? await runFullHealthCycle(parsed.data.to) : undefined;

  const result = await sendAutomatedEmailNow({
    to: parsed.data.to,
    subject: parsed.data.subject ?? "Cookie Bite — Test email",
    html: `<div style="font-family:sans-serif"><h2>Test email</h2><p>Sent from the admin email panel at ${new Date().toLocaleString("ar-EG")}.</p></div>`,
    emailType: "test",
    immediate: true,
  });

  return NextResponse.json({
    ok: result.ok,
    provider: result.provider,
    messageId: result.messageId,
    error: result.error,
    health,
  });
}

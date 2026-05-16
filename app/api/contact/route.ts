import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendContactNotification, sendContactAutoReply } from "@/lib/email/send";
import { EMAIL_CONFIG, isEmailConfigured } from "@/lib/email/resend";

const ContactSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(120),
  subject: z.string().min(2).max(140),
  message: z.string().min(5).max(2000),
  /** Honeypot — يجب أن يبقى فارغاً */
  _gotcha: z.string().max(80).optional(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ContactSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (parsed.data._gotcha?.trim()) {
    return Response.json({ ok: true });
  }

  const { name, email, subject, message } = parsed.data;

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("contact_messages")
    .insert({ name, email, subject, message });
  if (error) {
    console.error("contact insert error", error);
    return Response.json({ ok: false, error: "Could not save message" }, { status: 500 });
  }

  if (isEmailConfigured()) {
    // 1) Notify the brand inbox so the team can reply.
    sendContactNotification({
      to: EMAIL_CONFIG.inbox,
      payload: { name, email, subject, message },
    }).catch((err) => console.error("contact email failed", err));

    // 2) Auto-reply to the customer so they have a record + know we received it.
    sendContactAutoReply({ to: email, name, subject }).catch((err) =>
      console.error("contact auto-reply failed", err),
    );
  }

  return Response.json({ ok: true });
}

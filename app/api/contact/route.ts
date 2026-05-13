import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendContactNotification } from "@/lib/email/send";

const ContactSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(120),
  subject: z.string().min(2).max(140),
  message: z.string().min(5).max(2000),
  /** Honeypot — يجب أن يبقى فارغاً */
  _gotcha: z.string().max(80).optional(),
});

const OWNER_EMAIL = process.env.OWNER_BOOTSTRAP_EMAIL ?? "cookie.bite.orders@gmail.com";

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
  const { error } = await supabase.from("contact_messages").insert({ name, email, subject, message });
  if (error) {
    console.error("contact insert error", error);
    return Response.json({ ok: false, error: "Could not save message" }, { status: 500 });
  }

  try {
    await sendContactNotification({ to: OWNER_EMAIL, payload: { name, email, subject, message } });
  } catch (err) {
    console.error("contact email failed", err);
  }

  return Response.json({ ok: true });
}

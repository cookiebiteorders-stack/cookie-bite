import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const Schema = z.object({
  email: z.string().email().max(120),
  _gotcha: z.string().max(80).optional(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid email" }, { status: 400 });
  }

  if (parsed.data._gotcha?.trim()) {
    return Response.json({ ok: true });
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("newsletter_subscribers")
    .update({ is_active: false })
    .eq("email", parsed.data.email.toLowerCase());

  if (error) {
    console.error("newsletter unsubscribe error", error);
    return Response.json({ ok: false, error: "Could not unsubscribe" }, { status: 500 });
  }

  return Response.json({ ok: true });
}

import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const Schema = z.object({
  email: z.string().email().max(120),
  source: z.string().max(40).optional(),
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
    return Response.json(
      { ok: false, error: "Invalid email" },
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("newsletter_subscribers")
    .upsert(
      {
        email: parsed.data.email.toLowerCase(),
        source: parsed.data.source ?? "site",
        is_active: true,
      },
      { onConflict: "email" },
    );

  if (error) {
    console.error("newsletter upsert error", error);
    return Response.json({ ok: false, error: "Could not subscribe" }, { status: 500 });
  }

  return Response.json({ ok: true });
}

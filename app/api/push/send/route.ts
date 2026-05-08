import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyInternalSecret } from "@/lib/auth/verify-internal";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bilingualError } from "@/lib/validations";

const schema = z.object({
  user_id: z.string().uuid(),
  notification: z.object({
    title: z.string().min(1).max(120),
    body: z.string().min(1).max(500),
    url: z.string().min(1).max(500).optional(),
  }),
});

export async function POST(req: NextRequest) {
  if (!verifyInternalSecret(req)) {
    return NextResponse.json(bilingualError("Forbidden", "ممنوع"), {
      status: 403,
    });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid payload", "بيانات غير صالحة"),
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth_key, platform")
    .eq("user_id", parsed.data.user_id);

  // هنا فقط نعيد البيانات المطلوبة للإرسال الفعلي عبر Edge Function.
  return NextResponse.json({
    ok: true,
    subscriptions: subs ?? [],
    payload: {
      title: parsed.data.notification.title,
      body: parsed.data.notification.body,
      url: parsed.data.notification.url ?? "/",
    },
  });
}

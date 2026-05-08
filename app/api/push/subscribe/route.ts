import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { pushSubscriptionSchema, bilingualError } from "@/lib/validations";

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json(bilingualError("Unauthorized", "غير مصرح"), {
      status: 401,
    });
  }
  const parsed = pushSubscriptionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid payload", "بيانات غير صالحة"),
      { status: 400 },
    );
  }
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: profile.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.p256dh,
      auth_key: parsed.data.auth,
      platform: parsed.data.platform ?? null,
    },
    { onConflict: "endpoint" },
  );
  if (error) {
    return NextResponse.json(
      bilingualError("Failed to save subscription", "فشل حفظ الاشتراك"),
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json(bilingualError("Unauthorized", "غير مصرح"), {
      status: 401,
    });
  }
  const body = (await req.json().catch(() => null)) as { endpoint?: string } | null;
  if (!body?.endpoint) {
    return NextResponse.json(
      bilingualError("Missing endpoint", "النقطة الطرفية مفقودة"),
      { status: 400 },
    );
  }
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", profile.id)
    .eq("endpoint", body.endpoint);
  if (error) {
    return NextResponse.json(
      bilingualError("Failed to remove subscription", "فشل حذف الاشتراك"),
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}

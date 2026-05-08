import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { bilingualError } from "@/lib/validations";

const schema = z.object({ code: z.string().min(4).max(32) });

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json(bilingualError("Unauthorized", "غير مصرح"), {
      status: 401,
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
  const myAccount = await supabase
    .from("loyalty_accounts")
    .select("*")
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!myAccount.data) {
    return NextResponse.json(
      bilingualError("Loyalty account not found", "حساب الولاء غير موجود"),
      { status: 404 },
    );
  }
  if (myAccount.data.referred_by) {
    return NextResponse.json(
      bilingualError("Referral already applied", "تم تطبيق الإحالة مسبقًا"),
      { status: 400 },
    );
  }

  const inviter = await supabase
    .from("loyalty_accounts")
    .select("*")
    .eq("referral_code", parsed.data.code.toUpperCase())
    .maybeSingle();
  if (!inviter.data || inviter.data.user_id === profile.id) {
    return NextResponse.json(
      bilingualError("Invalid referral code", "كود الإحالة غير صالح"),
      { status: 400 },
    );
  }

  await supabase
    .from("loyalty_accounts")
    .update({
      referred_by: inviter.data.user_id,
      total_points: myAccount.data.total_points + 50,
      lifetime_points: myAccount.data.lifetime_points + 50,
    })
    .eq("id", myAccount.data.id);

  await supabase.from("loyalty_transactions").insert({
    account_id: myAccount.data.id,
    type: "bonus",
    points: 50,
    description_en: "Referral bonus",
    description_ar: "مكافأة إحالة",
  });

  return NextResponse.json({ ok: true, bonus_points: 50 });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { bilingualError } from "@/lib/validations";

const schema = z.object({
  points: z.number().int().min(100),
});

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
  const { data: account } = await supabase
    .from("loyalty_accounts")
    .select("*")
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!account) {
    return NextResponse.json(
      bilingualError("Loyalty account not found", "حساب الولاء غير موجود"),
      { status: 404 },
    );
  }
  if (account.total_points < parsed.data.points) {
    return NextResponse.json(
      bilingualError("Insufficient points", "النقاط غير كافية"),
      { status: 400 },
    );
  }

  const nextPoints = account.total_points - parsed.data.points;
  const tier =
    nextPoints >= 1000
      ? "cookie_monster"
      : nextPoints >= 500
        ? "cruncher"
        : "cookie_lover";
  const egpDiscount = Math.floor(parsed.data.points / 500) * 25;

  const { error: updateErr } = await supabase
    .from("loyalty_accounts")
    .update({ total_points: nextPoints, tier })
    .eq("id", account.id);
  if (updateErr) {
    return NextResponse.json(
      bilingualError("Failed to redeem points", "فشل استبدال النقاط"),
      { status: 500 },
    );
  }

  await supabase.from("loyalty_transactions").insert({
    account_id: account.id,
    type: "redeemed",
    points: -parsed.data.points,
    description_en: `Redeemed ${parsed.data.points} points`,
    description_ar: `تم استبدال ${parsed.data.points} نقطة`,
  });

  return NextResponse.json({
    ok: true,
    redeemed_points: parsed.data.points,
    discount_egp: egpDiscount,
    remaining_points: nextPoints,
  });
}

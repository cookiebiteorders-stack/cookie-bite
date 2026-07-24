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

  // Atomic check-and-deduct (single UPDATE ... WHERE total_points >= points
  // inside the DB function) — prevents a race where two concurrent requests
  // both pass a stale balance check and over-redeem.
  const { data, error: rpcError } = await supabase
    .rpc("redeem_loyalty_points", {
      p_user_id: profile.id,
      p_points: parsed.data.points,
    })
    .maybeSingle();

  if (rpcError) {
    if (rpcError.message?.includes("insufficient_points")) {
      return NextResponse.json(
        bilingualError("Insufficient points", "النقاط غير كافية"),
        { status: 400 },
      );
    }
    return NextResponse.json(
      bilingualError("Failed to redeem points", "فشل استبدال النقاط"),
      { status: 500 },
    );
  }

  const result = data as { account_id: string; remaining_points: number; new_tier: string } | null;
  if (!result) {
    return NextResponse.json(
      bilingualError("Loyalty account not found", "حساب الولاء غير موجود"),
      { status: 404 },
    );
  }

  const egpDiscount = Math.floor(parsed.data.points / 500) * 25;

  await supabase.from("loyalty_transactions").insert({
    account_id: result.account_id,
    type: "redeemed",
    points: -parsed.data.points,
    description_en: `Redeemed ${parsed.data.points} points`,
    description_ar: `تم استبدال ${parsed.data.points} نقطة`,
  });

  return NextResponse.json({
    ok: true,
    redeemed_points: parsed.data.points,
    discount_egp: egpDiscount,
    remaining_points: result.remaining_points,
  });
}

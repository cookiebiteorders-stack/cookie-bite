import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { bilingualError } from "@/lib/validations";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json(bilingualError("Unauthorized", "غير مصرح"), {
      status: 401,
    });
  }

  const supabase = createSupabaseAdminClient();
  const { data: account } = await supabase
    .from("loyalty_accounts")
    .select("*")
    .eq("user_id", profile.id)
    .maybeSingle();

  if (!account) {
    const referral = `CB-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const { data: created, error } = await supabase
      .from("loyalty_accounts")
      .insert({ user_id: profile.id, referral_code: referral })
      .select("*")
      .single();
    if (error || !created) {
      return NextResponse.json(
        bilingualError("Failed to create loyalty account", "فشل إنشاء حساب الولاء"),
        { status: 500 },
      );
    }
    return NextResponse.json({ account: created, transactions: [] });
  }

  const { data: txns } = await supabase
    .from("loyalty_transactions")
    .select("*")
    .eq("account_id", account.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const nextTierPoints =
    account.tier === "cookie_monster"
      ? 0
      : account.tier === "cruncher"
        ? Math.max(0, 1000 - account.total_points)
        : Math.max(0, 500 - account.total_points);

  return NextResponse.json({
    account,
    transactions: txns ?? [],
    next_tier_points: nextTierPoints,
  });
}

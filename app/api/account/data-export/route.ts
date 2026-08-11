import { auth } from "@/lib/auth/supabase-auth";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * لقطة بيانات حساسة للمستخدم المسجّل — خطوة أولى لمسار GDPR (تصدير).
 * لا يشمل حذفاً؛ يُنصح بمراجعة قانونية قبل التوسعة.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: { en: "Unauthorized", ar: "غير مصرح" } }, { status: 401 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data: profile } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
    const uid = typeof profile?.id === "string" ? profile.id : null;

    let orders: unknown[] = [];
    if (uid) {
      const { data } = await supabase
        .from("orders")
        .select("id,order_code,status,payment_status,total_egp,created_at")
        .eq("user_id", uid)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(500);
      orders = data ?? [];
    }

    return NextResponse.json({
      exported_at: new Date().toISOString(),
      clerk_user_id: userId,
      profile,
      orders,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "export failed";
    return NextResponse.json({ error: { en: msg, ar: "فشل التصدير" } }, { status: 500 });
  }
}

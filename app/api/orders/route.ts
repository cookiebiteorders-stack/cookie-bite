import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/supabase-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserBySupabaseId } from "@/lib/db/users";
import { bilingualError } from "@/lib/validations";

// ---------------------------------------------------------------------------
// GET — قائمة طلبات المستخدم الحالي
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      bilingualError("Unauthorized", "غير مصرح"),
      { status: 401 },
    );
  }

  const profile = await getUserBySupabaseId(userId);
  if (!profile) {
    return NextResponse.json(
      bilingualError("Profile not found", "الملف غير موجود"),
      { status: 404 },
    );
  }

  const limit = Math.min(
    Number(req.nextUrl.searchParams.get("limit") ?? 20),
    50,
  );

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_code, order_number, status, payment_status, payment_method, subtotal_egp, delivery_fee_egp, discount_amount_egp, total_egp, language, created_at",
    )
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("/api/orders GET error", error);
    return NextResponse.json(
      bilingualError("Database error", "خطأ في قاعدة البيانات"),
      { status: 500 },
    );
  }

  return NextResponse.json({ orders: data ?? [] });
}

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserByClerkId } from "@/lib/db/users";
import { bilingualError } from "@/lib/validations";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json(
      bilingualError("Missing id", "المعرّف مفقود"),
      { status: 400 },
    );
  }

  const { userId } = await auth();
  const supabase = createSupabaseAdminClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("/api/orders/[id] error", error);
    return NextResponse.json(
      bilingualError("Database error", "خطأ في قاعدة البيانات"),
      { status: 500 },
    );
  }
  if (!order) {
    return NextResponse.json(
      bilingualError("Order not found", "الطلب غير موجود"),
      { status: 404 },
    );
  }

  // التحقق من ملكية الطلب: مالكه أو ضيف بنفس البريد
  if (userId) {
    const profile = await getUserByClerkId(userId);
    if (!profile || order.user_id !== profile.id) {
      return NextResponse.json(
        bilingualError("Forbidden", "ممنوع"),
        { status: 403 },
      );
    }
  } else {
    return NextResponse.json(
      bilingualError("Unauthorized", "غير مصرح"),
      { status: 401 },
    );
  }

  const { data: items } = await supabase
    .from("order_items")
    .select(
      "id, product_id, product_name, product_snapshot, quantity, unit_price_egp, total_price_egp",
    )
    .eq("order_id", id);

  return NextResponse.json({ order, items: items ?? [] });
}

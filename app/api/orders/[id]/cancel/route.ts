import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserByClerkId } from "@/lib/db/users";
import { bilingualError } from "@/lib/validations";

const CANCELLABLE = new Set(["pending", "processing"]);

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      bilingualError("Unauthorized", "غير مصرح"),
      { status: 401 },
    );
  }

  const profile = await getUserByClerkId(userId);
  if (!profile) {
    return NextResponse.json(
      bilingualError("Profile not found", "الملف غير موجود"),
      { status: 404 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, user_id")
    .eq("id", id)
    .maybeSingle();

  if (!order || order.user_id !== profile.id) {
    return NextResponse.json(
      bilingualError("Order not found", "الطلب غير موجود"),
      { status: 404 },
    );
  }

  if (!CANCELLABLE.has(order.status as string)) {
    return NextResponse.json(
      bilingualError(
        "Order cannot be cancelled at this stage",
        "لا يمكن إلغاء الطلب في هذه المرحلة",
      ),
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) {
    console.error("orders cancel error", error);
    return NextResponse.json(
      bilingualError("Database error", "خطأ في قاعدة البيانات"),
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id, status: "cancelled" });
}

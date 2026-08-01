import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/supabase-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserBySupabaseId } from "@/lib/db/users";
import { notifyStoreOrderEvent } from "@/lib/notifications/store-order-events";
import { bilingualError } from "@/lib/validations";
import { requireCsrfProtection } from "@/lib/security/csrf";

const CANCELLABLE = new Set(["pending", "processing"]);

export async function POST(
  req: NextRequest,
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

  // Validate CSRF token for state-changing operation
  const csrfCheck = await requireCsrfProtection(req);
  if (!csrfCheck.valid) {
    return NextResponse.json(
      bilingualError(csrfCheck.error || "CSRF validation failed", "فشل التحقق من CSRF"),
      { status: 403 }
    );
  }

  const profile = await getUserBySupabaseId(userId);
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

  void notifyStoreOrderEvent({
    orderId: id,
    event: "status_cancelled",
    note: "Cancelled by customer from account",
  }).catch((err) => console.error("store cancel alert", err));

  return NextResponse.json({ ok: true, id, status: "cancelled" });
}

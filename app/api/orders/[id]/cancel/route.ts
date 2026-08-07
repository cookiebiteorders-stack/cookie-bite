import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/supabase-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserBySupabaseId } from "@/lib/db/users";
import { notifyStoreOrderEvent } from "@/lib/notifications/store-order-events";
import { bilingualError } from "@/lib/validations";
import { requireCsrfProtection } from "@/lib/security/csrf";

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
  
  // Use safe cancellation RPC that enforces payment_status and stock reconciliation
  const { data: result, error: rpcError } = await supabase.rpc("cancel_unpaid_order_transactional", {
    p_order_id: id,
    p_user_id: profile.id,
  });

  if (rpcError || !result?.[0]?.success) {
    const errorMessage = result?.[0]?.error_message || rpcError?.message || "Failed to cancel order";
    console.error("Order cancellation error:", errorMessage);
    return NextResponse.json(
      bilingualError(errorMessage, errorMessage),
      { status: 400 },
    );
  }

  void notifyStoreOrderEvent({
    orderId: id,
    event: "status_cancelled",
    note: "Cancelled by customer from account",
  }).catch((err) => console.error("store cancel alert", err));

  return NextResponse.json({ ok: true, id, status: "cancelled" });
}

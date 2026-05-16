import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { bilingualError } from "@/lib/validations";
import { paymobAuthToken, paymobRefundTransaction } from "@/lib/paymob/accept";

const bodySchema = z.object({
  order_id: z.string().uuid(),
  /**
   * عند true: تحديث الحالة في قاعدة البيانات فقط (بدون استدعاء Paymob).
   * للاستخدام في الاختبار أو عند تعذّر البوابة — يفضّل دوماً المسار الكامل مع Paymob في الإنتاج.
   */
  record_only: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("payments");
  requireWritePermission(actor);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid payload", "بيانات غير صالحة"), { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: before, error: fetchErr } = await supabase
    .from("orders")
    .select("*")
    .eq("id", parsed.data.order_id)
    .maybeSingle();

  if (fetchErr || !before) {
    return NextResponse.json(bilingualError("Order not found", "الطلب غير موجود"), { status: 404 });
  }

  const paymentStatus = String(before.payment_status ?? "").toLowerCase();
  if (paymentStatus !== "paid") {
    return NextResponse.json(
      bilingualError("Only paid orders can be refunded", "يمكن استرداد الطلبات المدفوعة فقط"),
      { status: 400 },
    );
  }

  let gatewayPayload: Record<string, unknown> | null = null;

  if (!parsed.data.record_only) {
    const apiKey = process.env.PAYMOB_API_KEY?.trim() ?? "";
    const txRaw = before.paymob_transaction_id;
    const txNum = txRaw != null && txRaw !== "" ? Number(txRaw) : Number.NaN;
    if (!apiKey) {
      return NextResponse.json(
        bilingualError(
          "PAYMOB_API_KEY missing — cannot call gateway (use record_only for manual reconciliation)",
          "مفتاح PAYMOB_API_KEY غير موجود — لا يمكن استدعاء البوابة",
        ),
        { status: 503 },
      );
    }
    if (!Number.isFinite(txNum)) {
      return NextResponse.json(
        bilingualError(
          "Missing numeric Paymob transaction id on order",
          "معرف معاملة Paymob غير موجود أو غير رقمي على الطلب",
        ),
        { status: 400 },
      );
    }

    const amountCents = Math.round(Number(before.total_egp ?? 0) * 100);
    if (amountCents <= 0) {
      return NextResponse.json(
        bilingualError("Invalid order total for refund", "إجمالي الطلب غير صالح للاسترداد"),
        { status: 400 },
      );
    }

    try {
      const token = await paymobAuthToken(apiKey);
      gatewayPayload = await paymobRefundTransaction(token, txNum, amountCents);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Paymob refund failed";
      return NextResponse.json(
        { ...bilingualError(msg, "فشل استرداد Paymob"), gateway_error: msg },
        { status: 502 },
      );
    }
  }

  const { data: after, error: updErr } = await supabase
    .from("orders")
    .update({
      payment_status: "refunded",
      status: "refunded",
    })
    .eq("id", parsed.data.order_id)
    .select("*")
    .single();

  if (updErr || !after) {
    return NextResponse.json(bilingualError("Failed to update order", "فشل تحديث الطلب"), { status: 500 });
  }

  await writeAuditLog({
    actor: {
      user_id: actor.user_id,
      email: actor.email,
      role: actor.role,
    },
    action: "payments.refund",
    module: "payments",
    entity_id: parsed.data.order_id,
    before,
    after,
    metadata: {
      record_only: Boolean(parsed.data.record_only),
      paymob: gatewayPayload,
    },
    request: req,
  });

  return NextResponse.json({
    ok: true,
    order: after,
    gateway: gatewayPayload,
    record_only: Boolean(parsed.data.record_only),
  });
}

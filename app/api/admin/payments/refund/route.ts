import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { bilingualError } from "@/lib/validations";
import { paymobAuthToken, paymobRefundTransaction } from "@/lib/paymob/accept";
import {
  processRefundTransactional,
  getRefundRequestByIdempotencyKey,
} from "@/lib/db/payments";

const bodySchema = z.object({
  order_id: z.string().uuid(),
  /**
   * عند true: تحديث الحالة في قاعدة البيانات فقط (بدون استدعاء Paymob).
   * للاستخدام في الاختبار أو عند تعذّر البوابة — يفضّل دوماً المسار الكامل مع Paymob في الإنتاج.
   */
  record_only: z.boolean().optional(),
  /**
   * Idempotency key to prevent duplicate refund processing
   */
  idempotency_key: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("payments");
  requireWritePermission(actor);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid payload", "بيانات غير صالحة"), { status: 400 });
  }

  // Disable record_only mode in production for financial safety
  if (process.env.NODE_ENV === "production" && parsed.data.record_only) {
    return NextResponse.json(
      bilingualError("record_only mode is disabled in production", "وضع record_only معطّل في الإنتاج"),
      { status: 400 },
    );
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

  // Generate idempotency key if not provided
  const idempotencyKey = parsed.data.idempotency_key || `refund-${parsed.data.order_id}-${Date.now()}`;

  // Check if this refund was already processed
  const existingRefund = await getRefundRequestByIdempotencyKey(idempotencyKey);
  if (existingRefund && existingRefund.status === "completed") {
    return NextResponse.json({
      ok: true,
      already_processed: true,
      refund_request_id: existingRefund.id,
      payment_event_id: existingRefund.payment_event_id,
      order: before,
    });
  }

  let gatewayPayload: Record<string, unknown> | null = null;
  let gatewayTransactionId: string | null = null;

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
      gatewayTransactionId = String(txNum);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Paymob refund failed";
      return NextResponse.json(
        { ...bilingualError(msg, "فشل استرداد Paymob"), gateway_error: msg },
        { status: 502 },
      );
    }
  }

  // Process refund transactionally with idempotency
  const amountCents = Math.round(Number(before.total_egp ?? 0) * 100);
  const refundResult = await processRefundTransactional({
    orderId: parsed.data.order_id,
    idempotencyKey,
    amountCents,
    reason: "Admin refund",
    requestedByUserId: actor.user_id,
    requestedByEmail: actor.email,
    gatewayTransactionId,
    gatewayResponse: gatewayPayload,
  });

  if (!refundResult.success) {
    return NextResponse.json(
      bilingualError(refundResult.errorMessage || "Refund processing failed", "فشل معالجة الاسترداد"),
      { status: 500 },
    );
  }

  // Fetch updated order for audit
  const { data: after, error: updErr } = await supabase
    .from("orders")
    .select("*")
    .eq("id", parsed.data.order_id)
    .maybeSingle();

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
    after: after ?? before,
    metadata: {
      record_only: Boolean(parsed.data.record_only),
      paymob: gatewayPayload,
      refund_request_id: refundResult.refundRequestId,
      payment_event_id: refundResult.paymentEventId,
      is_idempotent: refundResult.isIdempotent,
    },
    request: req,
  });

  return NextResponse.json({
    ok: true,
    order: after ?? before,
    gateway: gatewayPayload,
    record_only: Boolean(parsed.data.record_only),
    refund_request_id: refundResult.refundRequestId,
    payment_event_id: refundResult.paymentEventId,
    is_idempotent: refundResult.isIdempotent,
  });
}

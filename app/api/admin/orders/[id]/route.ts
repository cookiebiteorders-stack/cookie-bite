import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  requireAdminAccess,
  requireFullPermission,
  requireWritePermission,
} from "@/lib/admin/require-admin";
import { deleteOrderWithLifecycle } from "@/lib/orders/order-lifecycle";
import {
  notifyStoreOrderEvent,
  storeEventFromOrderPatch,
} from "@/lib/notifications/store-order-events";
import { sendOrderStatusEmail } from "@/lib/email/send";
import { onOrderShipped } from "@/lib/email/automation/triggers";
import { bilingualError } from "@/lib/validations";
import { writeAuditLog } from "@/lib/admin/audit";
import { ORDER_STATUS_VALUES, PAYMENT_STATUS_VALUES } from "@/lib/domain/order-enums";
import { awardLoyaltyPointsForPaidOrder } from "@/lib/loyalty/award-order-points";
import { syncOrderFinancialRecords } from "@/lib/orders/sync-order-financials";
import { schedulePaymentConfirmed, scheduleReviewRequest } from "@/lib/notifications/schedule";

const schema = z
  .object({
    status: z.enum(ORDER_STATUS_VALUES).optional(),
    payment_status: z.enum(PAYMENT_STATUS_VALUES).optional(),
    note: z.string().max(500).optional(),
    shipping_address: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (d) =>
      Boolean(d.status ?? d.payment_status ?? d.note ?? (d.shipping_address && Object.keys(d.shipping_address).length)),
    { message: "empty patch" },
  );

function statusUpdateMessage(
  lang: "ar" | "en",
  status: string,
  fallback?: string,
): string {
  if (fallback?.trim()) return fallback.trim();
  const ar: Record<string, string> = {
    pending: "طلبك قيد المراجعة الآن وسيتم الرد خلال 12–24 ساعة.",
    processing: "تم تأكيد طلبك وبدء التجهيز في المطبخ.",
    shipped: "تم شحن طلبك وهو الآن في الطريق.",
    delivered: "تم تسليم طلبك. نتمنى لك تجربة رائعة!",
    cancelled: "نعتذر، تم رفض/إلغاء الطلب. يمكنك التواصل معنا لمعرفة السبب أو إعادة الطلب.",
    refunded: "تمت عملية الاسترداد بنجاح.",
  };
  const en: Record<string, string> = {
    pending: "Your order is under review and will be updated within 12–24 hours.",
    processing: "Your order has been approved and is now in preparation.",
    shipped: "Your order has been shipped and is on the way.",
    delivered: "Your order has been delivered. We hope you enjoy it!",
    cancelled: "We are sorry — your order has been declined/cancelled. Contact us for details or place a new order.",
    refunded: "Your refund has been processed successfully.",
  };
  const map = lang === "ar" ? ar : en;
  return map[status] ?? (lang === "ar" ? "تم تحديث حالة طلبك." : "Your order status has been updated.");
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await requireAdminAccess("orders");
  const { id } = await ctx.params;
  const supabase = createSupabaseAdminClient();
  const { data: order, error: orderErr } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (orderErr || !order) {
    return NextResponse.json(bilingualError("Order not found", "الطلب غير موجود"), { status: 404 });
  }
  const { data: items, error: itemsErr } = await supabase.from("order_items").select("*").eq("order_id", id);
  if (itemsErr) {
    return NextResponse.json(bilingualError("Database error", "خطأ في قاعدة البيانات"), { status: 500 });
  }
  return NextResponse.json({ order, items: items ?? [] });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const actor = await requireAdminAccess("orders");
  requireWritePermission(actor);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid payload", "بيانات غير صالحة"),
      { status: 400 },
    );
  }

  const { id } = await ctx.params;
  const patch: Record<string, unknown> = {};
  if (parsed.data.status) patch.status = parsed.data.status;
  if (parsed.data.payment_status) patch.payment_status = parsed.data.payment_status;
  if (parsed.data.note) patch.notes = parsed.data.note;

  const supabase = createSupabaseAdminClient();

  const { data: before } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (parsed.data.shipping_address && before) {
    const prev =
      before.shipping_address && typeof before.shipping_address === "object" && !Array.isArray(before.shipping_address)
        ? (before.shipping_address as Record<string, unknown>)
        : {};
    patch.shipping_address = { ...prev, ...parsed.data.shipping_address };
  }

  const { data: order, error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !order) {
    return NextResponse.json(
      bilingualError("Failed to update order", "فشل تحديث الطلب"),
      { status: 500 },
    );
  }

  let to = order.guest_email ?? "";
  if (order.user_id) {
    const { data: user } = await supabase
      .from("users")
      .select("email")
      .eq("id", order.user_id)
      .maybeSingle();
    to = user?.email ?? to;
  }
  const wasDelivered = (before?.status ?? "").toLowerCase() === "delivered";
  const nowDelivered = (order.status ?? "").toLowerCase() === "delivered";
  if (!wasDelivered && nowDelivered) {
    void scheduleReviewRequest(id).catch((err) =>
      console.error("[admin/orders] schedule review_request", err),
    );
  }

  if (to && parsed.data.status) {
    if (parsed.data.status === "shipped") {
      try {
        await onOrderShipped({
          email: to,
          userId: order.user_id ?? null,
          orderId: order.order_code ?? String(order.order_number),
        });
      } catch (eventError) {
        console.error("order_shipped email trigger failed", eventError);
      }
    } else {
      const lang = order.language === "ar" ? "ar" : "en";
      await sendOrderStatusEmail({
        to,
        payload: {
          orderId: order.order_code ?? String(order.order_number),
          status: parsed.data.status,
          message: statusUpdateMessage(lang, parsed.data.status, parsed.data.note),
        },
      });
    }
  }

  const wasPaid = (before?.payment_status ?? "").toLowerCase() === "paid";
  const nowPaid = (order.payment_status ?? "").toLowerCase() === "paid";
  if (!wasPaid && nowPaid) {
    void syncOrderFinancialRecords(id).catch((err) =>
      console.error("sync invoice/payment after admin paid", err),
    );
    schedulePaymentConfirmed(id);
    void awardLoyaltyPointsForPaidOrder(id).catch((err) =>
      console.error("loyalty award after admin payment update", err),
    );
  }

  const patchEvents = storeEventFromOrderPatch(
    (before ?? null) as Record<string, unknown> | null,
    order as Record<string, unknown>,
  );
  for (const ev of patchEvents) {
    void notifyStoreOrderEvent({
      orderId: id,
      event: ev,
      note: parsed.data.note,
      actorEmail: actor.email,
    }).catch((err) => console.error("[admin/orders] store alert", ev, err));
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: parsed.data.status
      ? "order.update_status"
      : parsed.data.payment_status
        ? "order.update_payment_status"
        : "order.update",
    module: "orders",
    entity_id: id,
    before: before ?? null,
    after: order,
    metadata: {
      patch,
      notified_email: to || null,
      store_alerts: patchEvents,
    },
    request: req,
  });

  return NextResponse.json({ ok: true, order });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json(
      bilingualError("Invalid order id", "معرّف الطلب غير صالح"),
      { status: 400 },
    );
  }

  const actor = await requireAdminAccess("orders");
  requireFullPermission(actor);

  const supabase = createSupabaseAdminClient();
  const { data: before } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (!before) {
    return NextResponse.json(bilingualError("Order not found", "الطلب غير موجود"), {
      status: 404,
    });
  }

  let result;
  try {
    result = await deleteOrderWithLifecycle(supabase, id, {
      user_id: actor.user_id,
      email: actor.email,
      role: actor.role,
    });
  } catch (e) {
    console.error("[admin/orders/:id] DELETE", e);
    return NextResponse.json(bilingualError("Failed to delete order", "فشل حذف الطلب"), {
      status: 500,
    });
  }

  if (!result) {
    return NextResponse.json(bilingualError("Order not found", "الطلب غير موجود"), {
      status: 404,
    });
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "orders.delete",
    module: "orders",
    entity_id: id,
    before,
    after: null,
    metadata: {
      order_code: before.order_code ?? before.number ?? null,
      loyalty_reversed_points: result.loyalty.reversedPoints,
      loyalty_transactions_removed: result.loyalty.transactionCount,
      archived: result.archived,
      financial_records_preserved: true,
      lifecycle_retention_days: 30,
    },
    request: req,
  });

  try {
    revalidatePath("/admin/orders");
    revalidatePath("/admin/kitchen");
    revalidatePath("/admin/reports");
    revalidatePath("/admin/financial");
    revalidatePath("/admin/invoices");
    revalidatePath("/admin/payments");
  } catch {
    /* non-fatal */
  }

  return NextResponse.json({
    ok: true,
    loyalty: result.loyalty,
    archived: result.archived,
  });
}

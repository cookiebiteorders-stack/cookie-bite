import type { SupabaseClient } from "@supabase/supabase-js";
import { reverseLoyaltyPointsForOrder } from "@/lib/loyalty/reverse-order-loyalty";
import { notifyStoreOrderEvent } from "@/lib/notifications/store-order-events";
import {
  resolveOrderDisplayCode,
  resolveOrderDisplayNumber,
} from "@/lib/orders/order-row-compat";

export const ORDER_LIFECYCLE_RETENTION_DAYS = 30;

export type OrderLifecycleActor = {
  user_id: string | null;
  email: string | null;
  role: string;
};

export type OrderFinancialSnapshot = {
  items: Record<string, unknown>[];
  invoices: Record<string, unknown>[];
  payments: Record<string, unknown>[];
};

function expiresAtFromNow(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + ORDER_LIFECYCLE_RETENTION_DAYS);
  return d.toISOString();
}

function orderRefFromRow(row: Record<string, unknown>): string | null {
  return resolveOrderDisplayCode(row) ?? (resolveOrderDisplayNumber(row) != null
    ? String(resolveOrderDisplayNumber(row))
    : null);
}

export async function captureOrderFinancialSnapshot(
  supabase: SupabaseClient,
  orderId: string,
): Promise<OrderFinancialSnapshot> {
  const [itemsRes, invoicesRes, paymentsRes] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", orderId),
    supabase.from("invoices").select("*").eq("order_id", orderId),
    supabase.from("payments").select("*").eq("order_id", orderId),
  ]);

  return {
    items: (itemsRes.data ?? []) as Record<string, unknown>[],
    invoices: (invoicesRes.data ?? []) as Record<string, unknown>[],
    payments: (paymentsRes.data ?? []) as Record<string, unknown>[],
  };
}

/** يحذف الفواتير والمدفوعات المرتبطة (الفواتير لا تُحذف تلقائياً مع الطلب في الإنتاج). */
export async function deleteOrderFinancialRecords(
  supabase: SupabaseClient,
  orderId: string,
): Promise<{ invoices: number; payments: number }> {
  const { data: inv } = await supabase
    .from("invoices")
    .delete()
    .eq("order_id", orderId)
    .select("id");
  const { data: pay } = await supabase
    .from("payments")
    .delete()
    .eq("order_id", orderId)
    .select("id");

  return {
    invoices: inv?.length ?? 0,
    payments: pay?.length ?? 0,
  };
}

export async function recordOrderLifecycleEvent(
  supabase: SupabaseClient,
  input: {
    eventType: "created" | "deleted";
    order: Record<string, unknown>;
    financials: OrderFinancialSnapshot;
    actor: OrderLifecycleActor;
    extra?: Record<string, unknown>;
  },
): Promise<void> {
  const orderId = String(input.order.id ?? "");
  if (!orderId) return;

  const { error } = await supabase.from("order_lifecycle_events").insert({
    event_type: input.eventType,
    order_id: orderId,
    order_ref: orderRefFromRow(input.order),
    payload: {
      order: input.order,
      items: input.financials.items,
      invoices: input.financials.invoices,
      payments: input.financials.payments,
      ...input.extra,
    },
    actor_id: input.actor.user_id,
    actor_email: input.actor.email,
    actor_role: input.actor.role,
    expires_at: expiresAtFromNow(),
  });

  if (error) {
    console.error("order_lifecycle_events insert failed", error);
  }
}

/** يسجّل الإنشاء ثم يُستدعى بعد نجاح إدراج الطلب (best-effort). */
export async function recordOrderCreatedLifecycle(
  supabase: SupabaseClient,
  order: Record<string, unknown>,
  items: Record<string, unknown>[],
  actor: OrderLifecycleActor,
): Promise<void> {
  await recordOrderLifecycleEvent(supabase, {
    eventType: "created",
    order,
    financials: { items, invoices: [], payments: [] },
    actor,
  });
}

export type DeleteOrderWithLifecycleResult = {
  loyalty: { reversedPoints: number; transactionCount: number };
  archived: boolean;
};

/**
 * يسجّل الحذف في السجل، يعكس الولاء، ثم يُرشّف الطلب بدلاً من حذفه فعلياً.
 * في الإنتاج: لا يُحذف الطلب أو سجلاته المالية أبداً - يُستخدم النموذج الأرشيفي فقط.
 */
export async function deleteOrderWithLifecycle(
  supabase: SupabaseClient,
  orderId: string,
  actor: OrderLifecycleActor,
): Promise<DeleteOrderWithLifecycleResult | null> {
  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return null;

  const orderRow = order as Record<string, unknown>;
  const loyalty = await reverseLoyaltyPointsForOrder(orderId);

  await notifyStoreOrderEvent({
    orderId,
    event: "deleted",
    actorEmail: actor.email,
    note: "Order archived from admin; financial records preserved",
  });

  // Archive the order instead of deleting it
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: "cancelled",
      deleted_at: new Date().toISOString(),
      deleted_by: actor.user_id,
    })
    .eq("id", orderId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  // Record lifecycle event for audit trail
  await recordOrderLifecycleEvent(supabase, {
    eventType: "deleted",
    order: orderRow,
    financials: { items: [], invoices: [], payments: [] }, // Financials preserved, not deleted
    actor,
    extra: {
      loyalty_reversed_points: loyalty.reversedPoints,
      loyalty_transactions_removed: loyalty.transactionCount,
      archived: true,
      financial_records_preserved: true,
    },
  });

  return { loyalty, archived: true };
}

/** يحذف أحداث السجل منتهية الصلاحية (يُستدعى من cron — service role يتجاوز RLS). */
export async function purgeExpiredOrderLifecycleEvents(
  supabase: SupabaseClient,
): Promise<{ deleted: number }> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("order_lifecycle_events")
    .delete()
    .lte("expires_at", now)
    .select("id");

  if (error) {
    console.error("purge order_lifecycle_events", error);
    return { deleted: 0 };
  }

  return { deleted: data?.length ?? 0 };
}

import {
  createSupabaseAdminClient,
  tryCreateSupabaseAdminClient,
} from "@/lib/supabase/admin";
import type { DeliverySchedulingPersist } from "@/lib/checkout/delivery-scheduling";
import type { OrderItemRow, OrderRow } from "@/lib/db/types";
import { assertSlotAvailable, bookDeliverySlot } from "@/lib/delivery/slots";
import { recordPromoUse } from "@/lib/promo/validate-promo";

export type InsertCheckoutOrderInput = {
  userId: string | null;
  lines: {
    slug: string;
    name: string;
    unitPrice: number;
    quantity: number;
    selectedAddons?: Record<string, unknown>[];
    addonsTotalUnitPrice?: number;
    finalUnitPrice?: number;
    productSnapshot?: Record<string, unknown> | null;
    skipProductLookup?: boolean;
    variantId?: string | null;
    variantSnapshot?: Record<string, unknown> | null;
  }[];
  subtotalEgp: number;
  deliveryFeeEgp: number;
  discountAmountEgp?: number;
  promoCode?: string | null;
  promoId?: string | null;
  totalEgp: number;
  paymentMethod: string;
  paymentStatus: OrderRow["payment_status"];
  shippingAddress: Record<string, unknown>;
  notes: string | null;
  paymobAcceptOrderId?: number | null;
  guestEmail?: string | null;
  giftWrappingFeeEgp?: number;
  deliveryScheduling?: DeliverySchedulingPersist | null;
  orderType?: "standard" | "gift_box";
  giftBoxSnapshot?: Record<string, unknown> | null;
};

/** حفظ طلب + البنود؛ يعيد null إذا لم يُضبط Supabase أو فشل الإدراج. */
export async function insertCheckoutOrder(
  params: InsertCheckoutOrderInput,
): Promise<{ id: string; orderNumber: number } | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.warn("insertCheckoutOrder: missing Supabase env");
    return null;
  }

  const supabase = createSupabaseAdminClient();

  const insertRow: Record<string, unknown> = {
    user_id: params.userId,
    status: "pending",
    payment_status: params.paymentStatus,
    payment_method: params.paymentMethod,
    subtotal_egp: params.subtotalEgp,
    delivery_fee_egp: params.deliveryFeeEgp,
    total_egp: params.totalEgp,
    notes: params.notes,
    shipping_address: params.shippingAddress,
  };
  if (params.guestEmail) {
    insertRow.guest_email = params.guestEmail;
  }
  if (params.discountAmountEgp != null && params.discountAmountEgp > 0) {
    insertRow.discount_amount_egp = params.discountAmountEgp;
  }
  if (params.promoCode) {
    insertRow.promo_code = params.promoCode;
  }
  if (params.paymobAcceptOrderId != null) {
    insertRow.paymob_accept_order_id = params.paymobAcceptOrderId;
  }
  if (params.giftWrappingFeeEgp != null && params.giftWrappingFeeEgp > 0) {
    insertRow.gift_wrapping_fee_egp = params.giftWrappingFeeEgp;
  }
  if (params.orderType) {
    insertRow.order_type = params.orderType;
  }
  if (params.giftBoxSnapshot) {
    insertRow.gift_box_snapshot = params.giftBoxSnapshot;
  }

  const sched = params.deliveryScheduling;
  if (sched) {
    insertRow.scheduled_delivery_date = sched.scheduledDeliveryDate;
    insertRow.scheduled_delivery_time = sched.scheduledDeliveryTime;
    insertRow.delivery_slot_id = sched.deliverySlotId.startsWith("fallback-")
      ? null
      : sched.deliverySlotId;
    insertRow.delivery_slot = sched.deliverySlotLabel;
    insertRow.is_gift = sched.isGift;
    insertRow.hide_price = sched.hidePrice;
    insertRow.anonymous_sender = sched.anonymousSender;
    insertRow.sender_name = sched.senderName;
    insertRow.gift_message = sched.giftMessage;
    insertRow.recipient_name = sched.recipientName;
    insertRow.recipient_phone = sched.recipientPhone;
    insertRow.recipient_address = sched.recipientAddress;
  }

  if (sched?.deliverySlotId && !sched.deliverySlotId.startsWith("fallback-")) {
    try {
      await assertSlotAvailable(sched.deliverySlotId, sched.scheduledDeliveryDate);
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      if (code === "SLOT_FULL") {
        console.error("insertCheckoutOrder: slot full", sched.deliverySlotId);
        return null;
      }
    }
  }

  const { data: orderRow, error: orderErr } = await supabase
    .from("orders")
    .insert(insertRow)
    .select("id, order_number")
    .single();

  if (orderErr || !orderRow) {
    console.error("insertCheckoutOrder order error", orderErr);
    return null;
  }

  const orderId = orderRow.id as string;
  const orderNumber = Number(orderRow.order_number);

  const itemRows: {
    order_id: string;
    product_id: string | null;
    product_name: string;
    unit_price_egp: number;
    selected_addons: Record<string, unknown>[];
    addons_total_egp: number;
    final_total_egp: number;
    quantity: number;
    variant_id?: string | null;
    variant_snapshot?: Record<string, unknown> | null;
  }[] = [];

  for (const line of params.lines) {
    let productUuid: string | null = null;
    if (!line.skipProductLookup) {
      const { data: prod } = await supabase
        .from("products")
        .select("id")
        .eq("slug", line.slug)
        .maybeSingle();
      if (prod && typeof (prod as { id?: string }).id === "string") {
        productUuid = (prod as { id: string }).id;
      }
    }
    const row: Record<string, unknown> = {
      order_id: orderId,
      product_id: productUuid,
      product_name: line.name,
      unit_price_egp: line.unitPrice,
      selected_addons: line.selectedAddons ?? [],
      addons_total_egp: Number(line.addonsTotalUnitPrice ?? 0) * line.quantity,
      final_total_egp: Number(line.finalUnitPrice ?? line.unitPrice) * line.quantity,
      quantity: line.quantity,
    };
    if (line.productSnapshot) {
      row.product_snapshot = line.productSnapshot;
    }
    if (line.variantId) {
      row.variant_id = line.variantId;
    }
    if (line.variantSnapshot) {
      row.variant_snapshot = line.variantSnapshot;
    }
    itemRows.push(row as (typeof itemRows)[number]);
  }

  const { error: itemsErr } = await supabase.from("order_items").insert(itemRows);
  if (itemsErr) {
    console.error("insertCheckoutOrder items error", itemsErr);
    await supabase.from("orders").delete().eq("id", orderId);
    return null;
  }

  if (params.promoId) {
    try {
      await recordPromoUse({
        supabase,
        promoId: params.promoId,
        orderId,
        userId: params.userId,
      });
    } catch (promoErr) {
      console.error("insertCheckoutOrder promo use error (non-fatal)", promoErr);
    }
  }

  if (sched?.deliverySlotId && !sched.deliverySlotId.startsWith("fallback-")) {
    try {
      await bookDeliverySlot({
        orderId,
        slotId: sched.deliverySlotId,
        deliveryDate: sched.scheduledDeliveryDate,
      });
    } catch (bookErr) {
      console.error("insertCheckoutOrder slot booking failed (non-fatal)", bookErr);
    }
  }

  return { id: orderId, orderNumber };
}

export type PaymobPaymentUpdateResult =
  | { ok: false }
  | { ok: true; orderId: string; becamePaid: boolean; orderNumber: number };

export async function updateOrderPaymentByPaymobAcceptOrderId(
  paymobAcceptOrderId: number,
  patch: Pick<OrderRow, "payment_status"> & Partial<Pick<OrderRow, "status">>,
  paymobTransactionId?: string | null,
): Promise<PaymobPaymentUpdateResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return { ok: false };
  }
  const supabase = createSupabaseAdminClient();
  const txId = paymobTransactionId ?? null;

  const { data: current, error: readErr } = await supabase
    .from("orders")
    .select("id, order_number, payment_status, status, paymob_transaction_id")
    .eq("paymob_accept_order_id", paymobAcceptOrderId)
    .maybeSingle<
      Pick<OrderRow, "id" | "order_number" | "payment_status" | "status" | "paymob_transaction_id">
    >();

  if (readErr || !current) {
    if (readErr) console.error("updateOrderPaymentByPaymobAcceptOrderId read", readErr);
    return { ok: false };
  }

  const nextStatus = patch.status ?? current.status;
  const wasPaid = current.payment_status === "paid";
  const willBePaid = patch.payment_status === "paid";

  if (
    txId &&
    current.paymob_transaction_id === txId &&
    current.payment_status === patch.payment_status &&
    current.status === nextStatus
  ) {
    return {
      ok: true,
      orderId: current.id,
      becamePaid: willBePaid && !wasPaid,
      orderNumber: Number(current.order_number),
    };
  }

  const { error } = await supabase
    .from("orders")
    .update({
      payment_status: patch.payment_status,
      ...(patch.status ? { status: patch.status } : {}),
      ...(txId ? { paymob_transaction_id: txId } : {}),
    })
    .eq("paymob_accept_order_id", paymobAcceptOrderId);
  if (error) {
    console.error("updateOrderPaymentByPaymobAcceptOrderId", error);
    return { ok: false };
  }
  return {
    ok: true,
    orderId: current.id,
    becamePaid: willBePaid && !wasPaid,
    orderNumber: Number(current.order_number),
  };
}

export async function listRecentOrdersForUser(userId: string, limit = 5) {
  return listOrdersForUser(userId, limit);
}

/** Full order history for account page (newest first). */
export async function listOrdersForUser(userId: string, limit = 100) {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return [] as OrderRow[];
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("listOrdersForUser error", error);
    return [] as OrderRow[];
  }
  return (data as OrderRow[]) ?? [];
}

export async function countOrdersForUser(userId: string): Promise<number> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) {
    console.error("countOrdersForUser error", error);
    return 0;
  }
  return count ?? 0;
}

export async function listAllOrders(limit = 50) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("listAllOrders error", error);
    return [] as OrderRow[];
  }
  return (data as OrderRow[]) ?? [];
}

export async function getOrderItems(orderId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);
  if (error) {
    console.error("getOrderItems error", error);
    return [] as OrderItemRow[];
  }
  return (data as OrderItemRow[]) ?? [];
}

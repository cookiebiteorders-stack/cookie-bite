import {
  createSupabaseAdminClient,
  tryCreateSupabaseAdminClient,
} from "@/lib/supabase/admin";
import type { OrderItemRow, OrderRow } from "@/lib/db/types";

export type InsertCheckoutOrderInput = {
  userId: string | null;
  lines: { slug: string; name: string; unitPrice: number; quantity: number }[];
  subtotalEgp: number;
  deliveryFeeEgp: number;
  totalEgp: number;
  paymentMethod: string;
  paymentStatus: OrderRow["payment_status"];
  shippingAddress: Record<string, unknown>;
  notes: string | null;
  paymobAcceptOrderId?: number | null;
  guestEmail?: string | null;
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
  if (params.paymobAcceptOrderId != null) {
    insertRow.paymob_accept_order_id = params.paymobAcceptOrderId;
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
    quantity: number;
  }[] = [];

  for (const line of params.lines) {
    let productUuid: string | null = null;
    const { data: prod } = await supabase
      .from("products")
      .select("id")
      .eq("slug", line.slug)
      .maybeSingle();
    if (prod && typeof (prod as { id?: string }).id === "string") {
      productUuid = (prod as { id: string }).id;
    }
    itemRows.push({
      order_id: orderId,
      product_id: productUuid,
      product_name: line.name,
      unit_price_egp: line.unitPrice,
      quantity: line.quantity,
    });
  }

  const { error: itemsErr } = await supabase.from("order_items").insert(itemRows);
  if (itemsErr) {
    console.error("insertCheckoutOrder items error", itemsErr);
    await supabase.from("orders").delete().eq("id", orderId);
    return null;
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
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return [] as OrderRow[];
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("listRecentOrdersForUser error", error);
    return [] as OrderRow[];
  }
  return (data as OrderRow[]) ?? [];
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

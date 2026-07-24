import {
  createSupabaseAdminClient,
  tryCreateSupabaseAdminClient,
} from "@/lib/supabase/admin";
import { buildOrderItemInsertRow } from "@/lib/db/build-order-item-insert";
import type { OrderItemRow, OrderRow } from "@/lib/db/types";
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
  orderType?: "standard" | "gift_box";
  giftBoxSnapshot?: Record<string, unknown> | null;
  checkoutIdempotencyKey?: string | null;
};

export type CheckoutOrderIdempotencyRow = {
  id: string;
  order_number: number;
  order_code: string | null;
  payment_status: OrderRow["payment_status"];
  paymob_accept_order_id: number | null;
  total_egp: number;
};

/** حفظ طلب + البنود؛ يرمي خطأ مفصّل في حال الفشل. */
export async function insertCheckoutOrder(
  params: InsertCheckoutOrderInput,
): Promise<{ id: string; orderNumber: string }> {
  console.log("[Order Creation] Starting order creation with payload:", JSON.stringify(params, null, 2));

  // Validate required fields before attempting database insert
  if (!params.lines || params.lines.length === 0) {
    const error = "Order must contain at least one line item";
    console.error("[Order Creation] Validation error:", error);
    throw new Error(error);
  }

  if (params.totalEgp <= 0) {
    const error = `Order total must be greater than 0, got: ${params.totalEgp}`;
    console.error("[Order Creation] Validation error:", error);
    throw new Error(error);
  }

  if (params.subtotalEgp < 0) {
    const error = `Order subtotal cannot be negative, got: ${params.subtotalEgp}`;
    console.error("[Order Creation] Validation error:", error);
    throw new Error(error);
  }

  if (!params.paymentMethod) {
    const error = "Payment method is required";
    console.error("[Order Creation] Validation error:", error);
    throw new Error(error);
  }

  if (!params.paymentStatus) {
    const error = "Payment status is required";
    console.error("[Order Creation] Validation error:", error);
    throw new Error(error);
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    const error = "Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY)";
    console.error("[Order Creation]", error);
    throw new Error(error);
  }

  const supabase = createSupabaseAdminClient();

  // 1. Validate line items and perform product lookups before touching the database
  const preparedLines: Array<{ line: (typeof params.lines)[number]; productUuid: string | null }> = [];

  for (const line of params.lines) {
    if (!line.slug || typeof line.slug !== "string" || !line.slug.trim()) {
      throw new Error(`Invalid order item: missing required product slug for '${line.name || "unknown"}'`);
    }
    if (!line.name || typeof line.name !== "string" || !line.name.trim()) {
      throw new Error(`Invalid order item: missing required product name for slug '${line.slug}'`);
    }
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      throw new Error(`Invalid order item quantity '${line.quantity}' for product '${line.slug}'`);
    }
    if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) {
      throw new Error(`Invalid order item unit price '${line.unitPrice}' for product '${line.slug}'`);
    }

    let productUuid: string | null = null;
    let realSlug = line.slug.trim();

    if (!line.skipProductLookup) {
      const { data: prod, error: prodErr } = await supabase
        .from("products")
        .select("id, slug, name, title_en, price_egp")
        .eq("slug", realSlug)
        .maybeSingle();

      if (prodErr) {
        console.error("[Order Creation] Database error fetching product:", prodErr);
        throw new Error(`Database error fetching product '${realSlug}': ${prodErr.message}`);
      }

      if (!prod) {
        console.error("[Order Creation] Product not found in database for slug:", realSlug);
        throw new Error(`Product not found or unavailable in database for slug: '${realSlug}'`);
      }

      if (!prod.slug || typeof prod.slug !== "string" || !prod.slug.trim()) {
        throw new Error(`Product record in database is missing a valid slug for '${realSlug}'`);
      }

      productUuid = prod.id;
      realSlug = prod.slug.trim();
    }

    preparedLines.push({
      line: { ...line, slug: realSlug },
      productUuid,
    });
  }

  const codePart = Math.random().toString(36).substring(2, 8).toUpperCase();
  const orderCode = `CB-${codePart}`;

  const insertRow: Record<string, unknown> = {
    user_id: params.userId,
    status: "pending",
    payment_status: params.paymentStatus,
    payment_method: params.paymentMethod,
    subtotal_egp: params.subtotalEgp,
    delivery_fee_egp: params.deliveryFeeEgp,
    total_egp: params.totalEgp,
    shipping_address: params.shippingAddress,
    order_code: orderCode,
  };

  // Extract customer + delivery details from shippingAddress
  const shipping = params.shippingAddress as Record<string, unknown>;
  const customerName =
    typeof shipping.name === "string" && shipping.name.trim()
      ? shipping.name.trim()
      : "Guest Customer";
  const customerPhone =
    typeof shipping.phone === "string" && shipping.phone.trim()
      ? shipping.phone.trim()
      : "+201000000000";

  insertRow.full_name = customerName;
  insertRow.phone = customerPhone;
  insertRow.email =
    params.guestEmail ??
    (typeof shipping.email === "string" ? shipping.email : "") ??
    "";
  insertRow.address = params.shippingAddress;
  insertRow.subtotal = params.subtotalEgp;
  insertRow.delivery_fee = params.deliveryFeeEgp;
  insertRow.total = params.totalEgp;
  insertRow.currency = "EGP";
  insertRow.number = orderCode;

  if (shipping.phone_secondary) {
    insertRow.phone_secondary = shipping.phone_secondary;
  }
  if (shipping.governorate) {
    insertRow.governorate = shipping.governorate;
  }
  if (shipping.delivery_date) {
    insertRow.delivery_date = shipping.delivery_date;
  }
  if (shipping.delivery_time) {
    insertRow.delivery_time = shipping.delivery_time;
  }
  if (shipping.latitude != null) {
    insertRow.latitude = shipping.latitude;
  }
  if (shipping.longitude != null) {
    insertRow.longitude = shipping.longitude;
  }
  if (shipping.place_label) {
    insertRow.place_label = shipping.place_label;
  }

  if (params.guestEmail) {
    insertRow.guest_email = params.guestEmail;
  }
  if (params.notes) {
    insertRow.gift_message = params.notes;
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
  if (params.checkoutIdempotencyKey) {
    insertRow.checkout_idempotency_key = params.checkoutIdempotencyKey;
  }

  console.log("[Order Creation] Inserting order row:", JSON.stringify(insertRow, null, 2));

  const { data: orderRow, error: orderErr } = await supabase
    .from("orders")
    .insert(insertRow)
    .select("id, order_number, order_code")
    .single();

  if (orderErr || !orderRow) {
    const dupCode = (orderErr as { code?: string } | null)?.code;
    if (dupCode === "23505" && params.checkoutIdempotencyKey) {
      console.log("[Order Creation] Duplicate idempotency key detected, fetching existing order");
      const existing = await getCheckoutOrderByIdempotencyKey(params.checkoutIdempotencyKey);
      if (existing) {
        console.log("[Order Creation] Returning existing order:", existing.id);
        return { id: existing.id, orderNumber: String(existing.order_code || existing.id) };
      }
    }
    console.error("[Order Creation] Order insert error:", JSON.stringify(orderErr, null, 2));
    throw new Error(
      `Failed to insert order: ${orderErr?.message || JSON.stringify(orderErr) || "Unknown database error"}`
    );
  }

  console.log("[Order Creation] Order inserted successfully:", orderRow.id);

  const orderId = orderRow.id as string;
  const orderNumber = orderRow.order_code || String(orderRow.order_number);

  const itemRows: Record<string, unknown>[] = [];

  for (const prep of preparedLines) {
    const itemRow = buildOrderItemInsertRow(orderId, prep.line, prep.productUuid);

    // Final safety checks before database insert
    if (!itemRow.order_id) {
      throw new Error("Order item insert row missing required 'order_id'");
    }
    if (!itemRow.product_name) {
      throw new Error("Order item insert row missing required 'product_name'");
    }
    if (!itemRow.slug || typeof itemRow.slug !== "string" || !itemRow.slug.trim()) {
      throw new Error(`Order item insert row missing required 'slug' for '${prep.line.name}'`);
    }
    if (itemRow.quantity == null || Number(itemRow.quantity) <= 0) {
      throw new Error(`Order item insert row has invalid quantity '${itemRow.quantity}'`);
    }
    if (itemRow.unit_price_egp == null || Number(itemRow.unit_price_egp) < 0) {
      throw new Error(`Order item insert row has invalid unit price '${itemRow.unit_price_egp}'`);
    }

    itemRows.push(itemRow);
  }

  console.log("[Order Creation] Inserting", itemRows.length, "order items");

  const { error: itemsErr } = await supabase.from("order_items").insert(itemRows);
  if (itemsErr) {
    console.error("[Order Creation] Order items insert error:", JSON.stringify(itemsErr, null, 2));
    console.error("[Order Creation] Rolling back order:", orderId);
    await supabase.from("orders").delete().eq("id", orderId);
    throw new Error(
      `Failed to insert order items: ${itemsErr?.message || JSON.stringify(itemsErr) || "Unknown database error"}`
    );
  }

  console.log("[Order Creation] Order items inserted successfully");

  if (params.promoId) {
    try {
      console.log("[Order Creation] Recording promo use:", params.promoId);
      await recordPromoUse({
        supabase,
        promoId: params.promoId,
        orderId,
        userId: params.userId,
      });
      console.log("[Order Creation] Promo use recorded successfully");
    } catch (promoErr) {
      console.error("[Order Creation] Promo use error (non-fatal):", promoErr);
    }
  }

  console.log("[Order Creation] Order creation completed successfully:", { id: orderId, orderNumber });
  return { id: orderId, orderNumber };
}

export async function getCheckoutOrderByIdempotencyKey(
  idempotencyKey: string,
): Promise<CheckoutOrderIdempotencyRow | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return null;
  }
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, order_code, payment_status, paymob_accept_order_id, total_egp")
    .eq("checkout_idempotency_key", idempotencyKey)
    .maybeSingle<CheckoutOrderIdempotencyRow>();

  if (error) {
    console.error("getCheckoutOrderByIdempotencyKey", error);
    return null;
  }
  return data ?? null;
}

export async function updatePaymobAcceptOrderId(
  orderId: string,
  paymobAcceptOrderId: number,
): Promise<boolean> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return false;
  }
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({ paymob_accept_order_id: paymobAcceptOrderId })
    .eq("id", orderId);
  if (error) {
    console.error("updatePaymobAcceptOrderId", error);
    return false;
  }
  return true;
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

  // Never downgrade a paid order when a late/duplicate failure callback arrives.
  if (wasPaid && !willBePaid) {
    return {
      ok: true,
      orderId: current.id,
      becamePaid: false,
      orderNumber: Number(current.order_number),
    };
  }

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

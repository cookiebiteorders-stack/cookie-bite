import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveStaffRole } from "@/lib/admin/auth-role";
import { bilingualError } from "@/lib/validations";
import { fetchOrderItemsByOrderIds } from "@/lib/db/order-items-fetch";

import type { InvoiceDetailPayload, InvoiceDetailStatus } from "@/lib/invoices/invoice-detail-types";
import { loadManualInvoiceByStoredNumber } from "@/lib/invoices/load-invoice-by-number";

export type { InvoiceDetailPayload } from "@/lib/invoices/invoice-detail-types";

function toInvoiceStatus(raw: unknown): InvoiceDetailStatus {
  const value = typeof raw === "string" ? raw.toLowerCase() : "";
  if (value === "paid") return "paid";
  if (value === "failed") return "failed";
  if (value === "refunded") return "refunded";
  return "pending";
}

function normalizeInvoiceNumber(id: string, createdAt: string): string {
  const stamp = createdAt ? createdAt.slice(0, 10).replaceAll("-", "") : "00000000";
  return `INV-${stamp}-${id.slice(0, 8).toUpperCase()}`;
}

/**
 * يُحلّل رقم الفاتورة:
 *  - INV-YYYYMMDD-XXXXXXXX  →  من جدول `invoices` (استعلام بالـ id-prefix)
 *  - INV-NNNNNNNN          →  fallback: من جدول `orders` بـ order_number
 */
function parseInvoiceNumber(input: string): {
  kind: "invoice-id-prefix" | "order-number" | "stored-invoice-number";
  prefix?: string;
  orderNumber?: number;
  storedNumber?: string;
} | null {
  const trimmed = input.trim().toUpperCase();
  const manualSeqMatch = trimmed.match(/^INV-(\d{4})-(\d{4,})$/);
  if (manualSeqMatch) {
    return { kind: "stored-invoice-number", storedNumber: trimmed };
  }
  const fullMatch = trimmed.match(/^INV-(\d{8})-([0-9A-F]{8})$/);
  if (fullMatch) {
    return { kind: "invoice-id-prefix", prefix: fullMatch[2] };
  }
  const shortMatch = trimmed.match(/^INV-(\d{1,12})$/);
  if (shortMatch) {
    const n = Number(shortMatch[1]);
    if (Number.isFinite(n) && n > 0) {
      return { kind: "order-number", orderNumber: n };
    }
  }
  return null;
}

async function fetchUser(supabase: ReturnType<typeof createSupabaseAdminClient>, userId: string | null) {
  if (!userId) return null;
  const { data } = await supabase
    .from("users")
    .select("id, full_name, email")
    .eq("id", userId)
    .maybeSingle();
  return (data as { id: string; full_name: string | null; email: string | null } | null) ?? null;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ invoiceNumber: string }> },
) {
  const { invoiceNumber: invoiceNumberRaw } = await context.params;
  const invoiceNumber = decodeURIComponent(invoiceNumberRaw ?? "").trim();

  if (!invoiceNumber) {
    return NextResponse.json(
      bilingualError("Invoice number is required", "رقم الفاتورة مطلوب"),
      { status: 400 },
    );
  }

  const parsed = parseInvoiceNumber(invoiceNumber);
  if (!parsed) {
    return NextResponse.json(
      bilingualError("Invalid invoice number", "رقم فاتورة غير صالح"),
      { status: 400 },
    );
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      bilingualError("Unauthorized", "غير مصرح"),
      { status: 401 },
    );
  }

  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);
  const email = clerkUser.primaryEmailAddress?.emailAddress ?? null;
  const role = await resolveStaffRole({ email, clerkUserId: userId });
  const isStaff = role === "owner" || role === "admin" || role === "staff";

  const supabase = createSupabaseAdminClient();

  const { data: dbUserRow } = await supabase
    .from("users")
    .select("id, email")
    .eq("clerk_user_id", userId)
    .maybeSingle();
  const dbUserId = (dbUserRow as { id?: string } | null)?.id ?? null;
  const dbUserEmail = (dbUserRow as { email?: string | null } | null)?.email ?? email;

  let payload: InvoiceDetailPayload | null = null;

  if (parsed.kind === "stored-invoice-number") {
    payload = await loadManualInvoiceByStoredNumber(supabase, invoiceNumber.trim().toUpperCase());
  }

  /**
   * نتجنب تضمين order_items في الـ embed لأن بعض البيئات لا تحتوي على
   * عمود `product_name` (تستخدم `product_snapshot.name`)؛ نجلب البنود لاحقاً.
   */
  if (!payload && parsed.kind === "invoice-id-prefix" && parsed.prefix) {
    const lowerPrefix = parsed.prefix.toLowerCase();
    const { data, error } = await supabase
      .from("invoices")
      .select(
        `
        id,
        order_id,
        amount,
        status,
        issued_at,
        created_at,
        orders:order_id (
          id,
          order_code,
          order_number,
          status,
          guest_email,
          user_id,
          subtotal_egp,
          discount_amount_egp,
          delivery_fee_egp,
          notes,
          shipping_address
        ),
        payments (
          id,
          status,
          method,
          transaction_id,
          created_at
        )
      `,
      )
      .ilike("id", `${lowerPrefix}%`)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("[api/invoices/:n] invoices lookup", error.message);
    }
    const row = (data?.[0] as Record<string, unknown> | undefined) ?? null;
    if (row) {
      const orderRaw = row.orders;
      const order = ((Array.isArray(orderRaw) ? orderRaw[0] : orderRaw) as Record<string, unknown> | null) ?? null;
      const orderUserId = order?.user_id != null ? String(order.user_id) : null;
      const orderId = typeof order?.id === "string" ? order.id : null;
      const [user, itemsByOrderId] = await Promise.all([
        fetchUser(supabase, orderUserId),
        orderId
          ? fetchOrderItemsByOrderIds(supabase, [orderId])
          : Promise.resolve(new Map<string, never[]>()),
      ]);
      const items = orderId ? (itemsByOrderId.get(orderId) ?? []) : [];
      const payment = Array.isArray(row.payments) ? (row.payments[0] as Record<string, unknown> | undefined) : undefined;
      const issuedAt =
        (typeof row.issued_at === "string" ? row.issued_at : null) ??
        (typeof row.created_at === "string" ? row.created_at : null) ??
        new Date().toISOString();

      payload = {
        id: String(row.id ?? ""),
        invoice_number: normalizeInvoiceNumber(String(row.id ?? ""), issuedAt),
        amount_egp: Number(row.amount ?? 0),
        status: toInvoiceStatus(row.status),
        issued_at: issuedAt,
        customer_name: typeof user?.full_name === "string" ? user.full_name : null,
        customer_email:
          typeof user?.email === "string"
            ? user.email
            : typeof order?.guest_email === "string"
              ? order.guest_email
              : null,
        order: {
          id: orderId,
          order_code: typeof order?.order_code === "string" ? order.order_code : null,
          status: typeof order?.status === "string" ? order.status : null,
          items: items.map((item) => ({
            id: item.id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price_egp: item.unit_price_egp,
            total_price_egp:
              item.total_price_egp ??
              item.quantity * item.unit_price_egp,
          })),
          subtotal_egp:
            order?.subtotal_egp != null ? Number(order.subtotal_egp) : null,
          discount_amount_egp:
            order?.discount_amount_egp != null ? Number(order.discount_amount_egp) : null,
          delivery_fee_egp:
            order?.delivery_fee_egp != null ? Number(order.delivery_fee_egp) : null,
          notes: typeof order?.notes === "string" ? order.notes : null,
          shipping_address:
            (order?.shipping_address as Record<string, unknown> | null | undefined) ?? null,
        },
        payment: {
          id: typeof payment?.id === "string" ? payment.id : null,
          method: typeof payment?.method === "string" ? payment.method : null,
          transaction_id:
            typeof payment?.transaction_id === "string" ? payment.transaction_id : null,
          status: typeof payment?.status === "string" ? payment.status : null,
          paid_at: typeof payment?.created_at === "string" ? payment.created_at : null,
        },
      };
    }
  }

  if (!payload) {
    let orderRow: Record<string, unknown> | null = null;
    if (parsed.kind === "order-number" && parsed.orderNumber) {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          order_number,
          order_code,
          subtotal_egp,
          discount_amount_egp,
          delivery_fee_egp,
          total_egp,
          payment_status,
          payment_method,
          paymob_transaction_id,
          status,
          guest_email,
          user_id,
          notes,
          shipping_address,
          created_at,
          updated_at
        `,
        )
        .eq("order_number", parsed.orderNumber)
        .maybeSingle();
      if (error) {
        console.error("[api/invoices/:n] orders lookup", error.message);
      }
      orderRow = (data as Record<string, unknown> | null) ?? null;
    }

    if (!orderRow) {
      return NextResponse.json(
        bilingualError("Invoice not found", "الفاتورة غير موجودة"),
        { status: 404 },
      );
    }

    const orderUserId = orderRow.user_id != null ? String(orderRow.user_id) : null;
    const orderId = String(orderRow.id ?? "");
    const [user, itemsByOrderId] = await Promise.all([
      fetchUser(supabase, orderUserId),
      orderId
        ? fetchOrderItemsByOrderIds(supabase, [orderId])
        : Promise.resolve(new Map<string, never[]>()),
    ]);
    const items = orderId ? (itemsByOrderId.get(orderId) ?? []) : [];
    const createdAt =
      typeof orderRow.created_at === "string" ? orderRow.created_at : new Date().toISOString();
    const orderNumber = Number(orderRow.order_number ?? 0);
    const invoiceNum =
      Number.isFinite(orderNumber) && orderNumber > 0
        ? `INV-${String(orderNumber).padStart(8, "0")}`
        : normalizeInvoiceNumber(orderId, createdAt);

    payload = {
      id: orderId,
      invoice_number: invoiceNum,
      amount_egp: Number(orderRow.total_egp ?? 0),
      status: toInvoiceStatus(orderRow.payment_status),
      issued_at: createdAt,
      customer_name: typeof user?.full_name === "string" ? user.full_name : null,
      customer_email:
        typeof user?.email === "string"
          ? user.email
          : typeof orderRow.guest_email === "string"
            ? orderRow.guest_email
            : null,
      order: {
        id: orderId,
        order_code: typeof orderRow.order_code === "string" ? orderRow.order_code : null,
        status: typeof orderRow.status === "string" ? orderRow.status : null,
        items: items.map((item) => ({
          id: item.id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price_egp: item.unit_price_egp,
          total_price_egp:
            item.total_price_egp ?? item.quantity * item.unit_price_egp,
        })),
        subtotal_egp:
          orderRow.subtotal_egp != null ? Number(orderRow.subtotal_egp) : null,
        discount_amount_egp:
          orderRow.discount_amount_egp != null ? Number(orderRow.discount_amount_egp) : null,
        delivery_fee_egp:
          orderRow.delivery_fee_egp != null ? Number(orderRow.delivery_fee_egp) : null,
        notes: typeof orderRow.notes === "string" ? orderRow.notes : null,
        shipping_address:
          (orderRow.shipping_address as Record<string, unknown> | null | undefined) ?? null,
      },
      payment: {
        id: null,
        method: typeof orderRow.payment_method === "string" ? orderRow.payment_method : null,
        transaction_id:
          typeof orderRow.paymob_transaction_id === "string"
            ? orderRow.paymob_transaction_id
            : null,
        status: typeof orderRow.payment_status === "string" ? orderRow.payment_status : null,
        paid_at: typeof orderRow.updated_at === "string" ? orderRow.updated_at : createdAt,
      },
    };
  }

  /**
   * صلاحية الوصول:
   *  - الموظفون (owner/admin/staff): دائماً.
   *  - العميل: فقط إذا كانت الفاتورة لطلبه (user_id يطابق، أو guest_email يطابق بريد المستخدم).
   */
  if (!isStaff) {
    const clientEmail = payload.customer_email?.toLowerCase() ?? null;
    const matchesManualClient =
      Boolean(clientEmail && dbUserEmail && clientEmail === dbUserEmail.toLowerCase());

    const matchesUser =
      matchesManualClient ||
      (dbUserId &&
      payload.order.id != null &&
      // أعد جلب user_id للطلب للتحقق
      (await (async () => {
        const { data } = await supabase
          .from("orders")
          .select("user_id, guest_email")
          .eq("id", payload!.order.id!)
          .maybeSingle();
        const row = (data as { user_id: string | null; guest_email: string | null } | null) ?? null;
        if (!row) return false;
        if (row.user_id && row.user_id === dbUserId) return true;
        if (
          dbUserEmail &&
          row.guest_email &&
          row.guest_email.toLowerCase() === dbUserEmail.toLowerCase()
        ) {
          return true;
        }
        return false;
      })()));

    if (!matchesUser) {
      return NextResponse.json(
        bilingualError("Forbidden", "ممنوع"),
        { status: 403 },
      );
    }
  }

  return NextResponse.json({ invoice: payload });
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";

type InvoiceStatus = "paid" | "pending" | "failed" | "refunded";

type InvoiceApiRow = {
  id: string;
  invoice_number: string;
  amount_egp: number;
  status: InvoiceStatus;
  issued_at: string;
  customer_name: string | null;
  customer_email: string | null;
  order: {
    id: string | null;
    order_code: string | null;
    status: string | null;
    items: Array<{
      id: string;
      product_name: string;
      quantity: number;
      unit_price_egp: number;
    }>;
  };
  payment: {
    id: string | null;
    method: string | null;
    transaction_id: string | null;
    status: string | null;
    paid_at: string | null;
  };
};

function toInvoiceStatus(raw: unknown): InvoiceStatus {
  const value = typeof raw === "string" ? raw.toLowerCase() : "";
  if (value === "paid") return "paid";
  if (value === "failed") return "failed";
  if (value === "refunded") return "refunded";
  return "pending";
}

function toNumber(value: string | null, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeInvoiceNumber(id: string, createdAt: string, fallbackPrefix = "INV"): string {
  const stamp = createdAt ? createdAt.slice(0, 10).replaceAll("-", "") : "00000000";
  return `${fallbackPrefix}-${stamp}-${id.slice(0, 8).toUpperCase()}`;
}

function toIsoBoundaryStart(date: string | null): string | null {
  if (!date) return null;
  const v = new Date(`${date}T00:00:00.000Z`);
  return Number.isNaN(v.getTime()) ? null : v.toISOString();
}

function toIsoBoundaryEnd(date: string | null): string | null {
  if (!date) return null;
  const v = new Date(`${date}T23:59:59.999Z`);
  return Number.isNaN(v.getTime()) ? null : v.toISOString();
}

export async function GET(request: NextRequest) {
  const actor = await requireAdminAccess("invoices");
  const supabase = createSupabaseAdminClient();

  const params = request.nextUrl.searchParams;
  const page = Math.max(1, toNumber(params.get("page"), 1));
  const pageSize = Math.min(100, Math.max(10, toNumber(params.get("pageSize"), 20)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const status = params.get("status")?.toLowerCase() ?? "all";
  const customerQuery = params.get("customer")?.trim().toLowerCase() ?? "";
  const minAmount = toNumber(params.get("minAmount"), Number.NaN);
  const maxAmount = toNumber(params.get("maxAmount"), Number.NaN);
  const dateFrom = toIsoBoundaryStart(params.get("dateFrom"));
  const dateTo = toIsoBoundaryEnd(params.get("dateTo"));

  const debug: Record<string, unknown> = {
    source: "invoices",
    query: "invoices + orders + users + payments",
  };

  let invoiceRows: InvoiceApiRow[] = [];
  let total = 0;

  const invoicesQuery = supabase
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
        status,
        guest_email,
        user_id,
        order_items (
          id,
          product_name,
          quantity,
          unit_price_egp
        ),
        users:user_id (
          id,
          full_name,
          email
        )
      ),
      payments (
        id,
        status,
        method,
        transaction_id,
        created_at
      )
    `,
      { count: "exact" },
    )
    .order("issued_at", { ascending: false })
    .range(from, to);

  const { data: invoicesData, error: invoicesError, count: invoicesCount } = await invoicesQuery;

  if (!invoicesError) {
    total = invoicesCount ?? 0;
    invoiceRows = (invoicesData ?? []).map((row: Record<string, unknown>) => {
      const order = (row.orders as Record<string, unknown> | null) ?? null;
      const user = (order?.users as Record<string, unknown> | null) ?? null;
      const payment = Array.isArray(row.payments) ? (row.payments[0] as Record<string, unknown> | undefined) : undefined;
      const issuedAt =
        (typeof row.issued_at === "string" ? row.issued_at : null) ??
        (typeof row.created_at === "string" ? row.created_at : null) ??
        new Date().toISOString();

      return {
        id: String(row.id ?? ""),
        invoice_number: normalizeInvoiceNumber(String(row.id ?? ""), issuedAt, "INV"),
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
          id: typeof order?.id === "string" ? order.id : null,
          order_code: typeof order?.order_code === "string" ? order.order_code : null,
          status: typeof order?.status === "string" ? order.status : null,
          items: Array.isArray(order?.order_items)
            ? (order?.order_items as Record<string, unknown>[]).map((item) => ({
                id: String(item.id ?? ""),
                product_name: String(item.product_name ?? "Unknown item"),
                quantity: Number(item.quantity ?? 0),
                unit_price_egp: Number(item.unit_price_egp ?? 0),
              }))
            : [],
        },
        payment: {
          id: typeof payment?.id === "string" ? payment.id : null,
          method: typeof payment?.method === "string" ? payment.method : null,
          transaction_id: typeof payment?.transaction_id === "string" ? payment.transaction_id : null,
          status: typeof payment?.status === "string" ? payment.status : null,
          paid_at: typeof payment?.created_at === "string" ? payment.created_at : null,
        },
      };
    });
  } else {
    debug.fallback_reason = invoicesError.message;
    debug.fallback_code = invoicesError.code;
    debug.source = "orders_fallback";
    debug.query = "orders + order_items + users";

    let ordersQuery = supabase
      .from("orders")
      .select(
        `
        id,
        order_number,
        order_code,
        total_egp,
        payment_status,
        payment_method,
        paymob_transaction_id,
        status,
        guest_email,
        user_id,
        created_at,
        updated_at,
        order_items (
          id,
          product_name,
          quantity,
          unit_price_egp
        ),
        users:user_id (
          id,
          full_name,
          email
        )
      `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    if (status !== "all") {
      if (status === "pending") ordersQuery = ordersQuery.eq("payment_status", "unpaid");
      else ordersQuery = ordersQuery.eq("payment_status", status);
    }
    if (dateFrom) ordersQuery = ordersQuery.gte("created_at", dateFrom);
    if (dateTo) ordersQuery = ordersQuery.lte("created_at", dateTo);
    if (Number.isFinite(minAmount)) ordersQuery = ordersQuery.gte("total_egp", minAmount);
    if (Number.isFinite(maxAmount)) ordersQuery = ordersQuery.lte("total_egp", maxAmount);
    ordersQuery = ordersQuery.range(from, to);

    const { data: ordersData, error: ordersError, count: ordersCount } = await ordersQuery;
    if (ordersError) {
      return NextResponse.json(
        {
          ...bilingualError("Failed to load invoices", "تعذّر تحميل الفواتير"),
          code: ordersError.code,
          details: actor.role === "owner" ? ordersError.message : undefined,
        },
        { status: 500 },
      );
    }

    total = ordersCount ?? 0;
    invoiceRows = (ordersData ?? []).map((o: Record<string, unknown>) => {
      const user = (o.users as Record<string, unknown> | null) ?? null;
      const createdAt = typeof o.created_at === "string" ? o.created_at : new Date().toISOString();
      const orderNumber = Number(o.order_number ?? 0);
      const invoiceNumber =
        Number.isFinite(orderNumber) && orderNumber > 0
          ? `INV-${String(orderNumber).padStart(8, "0")}`
          : normalizeInvoiceNumber(String(o.id ?? ""), createdAt, "INV");
      return {
        id: String(o.id ?? ""),
        invoice_number: invoiceNumber,
        amount_egp: Number(o.total_egp ?? 0),
        status: toInvoiceStatus(o.payment_status),
        issued_at: createdAt,
        customer_name: typeof user?.full_name === "string" ? user.full_name : null,
        customer_email:
          typeof user?.email === "string"
            ? user.email
            : typeof o.guest_email === "string"
              ? o.guest_email
              : null,
        order: {
          id: String(o.id ?? ""),
          order_code: typeof o.order_code === "string" ? o.order_code : null,
          status: typeof o.status === "string" ? o.status : null,
          items: Array.isArray(o.order_items)
            ? (o.order_items as Record<string, unknown>[]).map((item) => ({
                id: String(item.id ?? ""),
                product_name: String(item.product_name ?? "Unknown item"),
                quantity: Number(item.quantity ?? 0),
                unit_price_egp: Number(item.unit_price_egp ?? 0),
              }))
            : [],
        },
        payment: {
          id: null,
          method: typeof o.payment_method === "string" ? o.payment_method : null,
          transaction_id:
            typeof o.paymob_transaction_id === "string" ? o.paymob_transaction_id : null,
          status: typeof o.payment_status === "string" ? o.payment_status : null,
          paid_at: typeof o.updated_at === "string" ? o.updated_at : createdAt,
        },
      };
    });
  }

  const filteredRows = invoiceRows.filter((row) => {
    if (status !== "all" && row.status !== status) return false;
    if (customerQuery) {
      const haystack = `${row.customer_name ?? ""} ${row.customer_email ?? ""}`.toLowerCase();
      if (!haystack.includes(customerQuery)) return false;
    }
    if (Number.isFinite(minAmount) && row.amount_egp < minAmount) return false;
    if (Number.isFinite(maxAmount) && row.amount_egp > maxAmount) return false;
    if (dateFrom && new Date(row.issued_at).getTime() < new Date(dateFrom).getTime()) return false;
    if (dateTo && new Date(row.issued_at).getTime() > new Date(dateTo).getTime()) return false;
    return true;
  });

  const response: {
    invoices: InvoiceApiRow[];
    pagination: { page: number; pageSize: number; total: number; hasMore: boolean };
    meta: { source: string };
    debug?: Record<string, unknown>;
    actor: { role: string; permission: string };
  } = {
    invoices: filteredRows,
    pagination: {
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
    },
    meta: {
      source: String(debug.source ?? "orders_fallback"),
    },
    actor: {
      role: actor.role,
      permission: actor.permission,
    },
  };

  if (actor.role === "owner") {
    response.debug = debug;
  }

  return NextResponse.json(response);
}


import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { bilingualError } from "@/lib/validations";
import { fetchOrderItemsByOrderIds } from "@/lib/db/order-items-fetch";
import {
  fetchLatestPaymentsByOrderIds,
  isMissingInvoicesTableError,
} from "@/lib/db/payments-fetch";

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

type UserLookupRow = { full_name: string | null; email: string | null };

/** PostgREST يتطلب FK من orders.user_id → users.id لـ `users:user_id (...)`؛ نجلب المستخدمين منفصلاً لتفادي أخطاء schema cache. */
async function fetchUserLookupByIds(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userIds: string[],
): Promise<Map<string, UserLookupRow>> {
  const map = new Map<string, UserLookupRow>();
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return map;

  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email")
    .in("id", unique);

  if (error) {
    console.error("[api/admin/invoices] users lookup:", error.message);
    return map;
  }

  for (const row of data ?? []) {
    const r = row as { id: string; full_name: string | null; email: string | null };
    map.set(String(r.id), { full_name: r.full_name ?? null, email: r.email ?? null });
  }
  return map;
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
    query: "invoices + orders + payments; order_items batched separately",
  };

  let invoiceRows: InvoiceApiRow[] = [];
  let total = 0;

  /**
   * تجنّبنا تضمين order_items داخل الـ embed لأن بعض البيئات تحتوي على
   * أعمدة مختلفة (`product_snapshot.name` بدلاً من `product_name`)
   * وكان PostgREST يفشل بـ "column order_items_1.product_name does not exist".
   * بدلاً من ذلك نجلب البنود بـ select * منفصل ونوحّدها في الذاكرة.
   */
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
        user_id
      )
    `,
      { count: "exact" },
    )
    .order("issued_at", { ascending: false })
    .range(from, to);

  const { data: invoicesData, error: invoicesError, count: invoicesCount } = await invoicesQuery;

  if (invoicesError && isMissingInvoicesTableError(invoicesError.message)) {
    return NextResponse.json(
      {
        ...bilingualError(
          "Invoices table is missing. Run Supabase migration 0019_invoices_payments_ensure.sql (or 0008).",
          "جدول الفواتير غير موجود. شغّل ترحيل Supabase 0019_invoices_payments_ensure.sql (أو 0008).",
        ),
        code: "invoices_table_missing",
        migration: "0019_invoices_payments_ensure.sql",
      },
      { status: 503 },
    );
  }

  if (!invoicesError) {
    total = invoicesCount ?? 0;
    const invoiceUserIds = (invoicesData ?? [])
      .map((row) => {
        const r = row as unknown as Record<string, unknown>;
        const orderRaw = r.orders;
        const order = (Array.isArray(orderRaw) ? orderRaw[0] : orderRaw) as
          | Record<string, unknown>
          | null
          | undefined;
        return order?.user_id != null ? String(order.user_id) : null;
      })
      .filter((x): x is string => Boolean(x));
    const userLookup = await fetchUserLookupByIds(supabase, invoiceUserIds);

    const orderIds = (invoicesData ?? [])
      .map((row) => {
        const r = row as unknown as Record<string, unknown>;
        const orderRaw = r.orders;
        const order = (Array.isArray(orderRaw) ? orderRaw[0] : orderRaw) as
          | Record<string, unknown>
          | null
          | undefined;
        return order?.id != null ? String(order.id) : null;
      })
      .filter((x): x is string => Boolean(x));
    const itemsByOrderId = await fetchOrderItemsByOrderIds(supabase, orderIds);
    const paymentsByOrderId = await fetchLatestPaymentsByOrderIds(supabase, orderIds);

    invoiceRows = (invoicesData ?? []).map((raw) => {
      const row = raw as unknown as Record<string, unknown>;
      const orderRaw = row.orders;
      const order = ((Array.isArray(orderRaw) ? orderRaw[0] : orderRaw) as Record<string, unknown> | null) ?? null;
      const userId = order?.user_id != null ? String(order.user_id) : null;
      const user = userId ? userLookup.get(userId) : undefined;
      const orderIdForPay = typeof order?.id === "string" ? order.id : null;
      const payment = orderIdForPay ? paymentsByOrderId.get(orderIdForPay) : undefined;
      const issuedAt =
        (typeof row.issued_at === "string" ? row.issued_at : null) ??
        (typeof row.created_at === "string" ? row.created_at : null) ??
        new Date().toISOString();
      const orderId = typeof order?.id === "string" ? order.id : null;
      const items = orderId ? itemsByOrderId.get(orderId) ?? [] : [];

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
          id: orderId,
          order_code: typeof order?.order_code === "string" ? order.order_code : null,
          status: typeof order?.status === "string" ? order.status : null,
          items: items.map((item) => ({
            id: item.id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price_egp: item.unit_price_egp,
          })),
        },
        payment: {
          id: payment?.id ?? null,
          method: payment?.method ?? null,
          transaction_id: payment?.transaction_id ?? null,
          status: payment?.status ?? null,
          paid_at: payment?.created_at ?? null,
        },
      };
    });
    debug.source = "invoices";
  } else {
    debug.fallback_reason = invoicesError.message;
    debug.fallback_code = invoicesError.code;
    debug.source = "orders_fallback";
    debug.query = "orders + users + order_items (all batched separately)";

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
        updated_at
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
    const orderUserIds = (ordersData ?? [])
      .map((o) => (o.user_id != null ? String(o.user_id) : null))
      .filter((x): x is string => Boolean(x));
    const userLookup = await fetchUserLookupByIds(supabase, orderUserIds);

    const orderIdsForItems = (ordersData ?? [])
      .map((o) => (o.id != null ? String(o.id) : null))
      .filter((x): x is string => Boolean(x));
    const itemsByOrderId = await fetchOrderItemsByOrderIds(supabase, orderIdsForItems);

    invoiceRows = (ordersData ?? []).map((o: Record<string, unknown>) => {
      const userId = o.user_id != null ? String(o.user_id) : null;
      const user = userId ? userLookup.get(userId) : undefined;
      const createdAt = typeof o.created_at === "string" ? o.created_at : new Date().toISOString();
      const orderNumber = Number(o.order_number ?? 0);
      const orderId = String(o.id ?? "");
      const items = itemsByOrderId.get(orderId) ?? [];
      const invoiceNumber =
        Number.isFinite(orderNumber) && orderNumber > 0
          ? `INV-${String(orderNumber).padStart(8, "0")}`
          : normalizeInvoiceNumber(orderId, createdAt, "INV");
      return {
        id: orderId,
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
          id: orderId,
          order_code: typeof o.order_code === "string" ? o.order_code : null,
          status: typeof o.status === "string" ? o.status : null,
          items: items.map((item) => ({
            id: item.id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price_egp: item.unit_price_egp,
          })),
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

const createInvoiceSchema = z.object({
  order_id: z.string().uuid().optional().nullable(),
  /** DB allows 0 for placeholder / manual drafts */
  amount_egp: z.number().nonnegative(),
  status: z.enum(["pending", "paid", "failed", "refunded"]).optional().default("pending"),
});

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("invoices");
  requireWritePermission(actor);

  const parsed = createInvoiceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid payload", "بيانات غير صالحة"), {
      status: 400,
    });
  }

  const supabase = createSupabaseAdminClient();
  if (parsed.data.order_id) {
    const { data: orderRow } = await supabase
      .from("orders")
      .select("id")
      .eq("id", parsed.data.order_id)
      .maybeSingle();
    if (!orderRow) {
      return NextResponse.json(bilingualError("Order not found", "الطلب غير موجود"), {
        status: 404,
      });
    }
  }

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      order_id: parsed.data.order_id ?? null,
      amount: parsed.data.amount_egp,
      status: parsed.data.status,
    })
    .select("id, order_id, amount, status, issued_at")
    .single();

  if (error || !data) {
    console.error("invoice insert", error);
    if (error && isMissingInvoicesTableError(error.message)) {
      return NextResponse.json(
        {
          ...bilingualError(
            "Invoices table is missing. Run migration 0019_invoices_payments_ensure.sql on Supabase.",
            "جدول الفواتير غير موجود. طبّق ترحيل 0019 على Supabase.",
          ),
          code: "invoices_table_missing",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(bilingualError("Failed to create invoice", "فشل إنشاء الفاتورة"), {
      status: 500,
    });
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "invoices.create",
    module: "invoices",
    entity_id: data.id,
    after: data,
    request: req,
  });

  return NextResponse.json(
    {
      ok: true,
      invoice: {
        id: data.id,
        order_id: data.order_id,
        amount_egp: Number(data.amount),
        status: data.status,
        issued_at: data.issued_at,
      },
    },
    { status: 201 },
  );
}


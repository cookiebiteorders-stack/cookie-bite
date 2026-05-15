import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";
import {
  buildDailyTrend,
  buildGatewayHealth,
  buildMethodMix,
} from "@/lib/payments/build-payment-analytics";
import type {
  PaymentSummaryResponse,
  PaymentTransactionRow,
} from "@/lib/payments/payment-summary-types";

type RawOrder = Record<string, unknown>;

function isMissingColumnError(err: { message?: string; code?: string }): boolean {
  const m = (err.message ?? "").toLowerCase();
  return (
    err.code === "42703" ||
    err.code === "PGRST204" ||
    (m.includes("column") && m.includes("does not exist"))
  );
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeRow(raw: RawOrder): PaymentTransactionRow {
  return {
    id: String(raw.id ?? ""),
    order_code: raw.order_code == null ? null : String(raw.order_code),
    guest_email: raw.guest_email == null ? null : String(raw.guest_email),
    user_id: raw.user_id == null ? null : String(raw.user_id),
    total_egp: num(raw.total_egp),
    payment_status: String(raw.payment_status ?? "unknown"),
    payment_method: raw.payment_method == null ? null : String(raw.payment_method),
    paymob_transaction_id:
      raw.paymob_transaction_id == null || raw.paymob_transaction_id === ""
        ? null
        : String(raw.paymob_transaction_id),
    paymob_accept_order_id: (() => {
      if (raw.paymob_accept_order_id == null || raw.paymob_accept_order_id === "") return null;
      const n = Number(raw.paymob_accept_order_id);
      return Number.isFinite(n) ? n : null;
    })(),
    created_at: String(raw.created_at ?? new Date().toISOString()),
  };
}

const SELECT_ATTEMPTS = [
  "id,order_code,guest_email,user_id,total_egp,payment_status,payment_method,paymob_transaction_id,paymob_accept_order_id,created_at",
  "id,order_code,guest_email,user_id,total_egp,payment_status,payment_method,paymob_transaction_id,created_at",
  "id,order_code,guest_email,total_egp,payment_status,payment_method,paymob_transaction_id,created_at",
  "id,total_egp,payment_status,payment_method,paymob_transaction_id,created_at",
  "id,total_egp,payment_status,payment_method,created_at",
] as const;

export async function GET() {
  await requireAdminAccess("payments");

  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch (e) {
    console.error("[api/admin/payments/summary] Supabase client:", e);
    const body: Record<string, unknown> = {
      ...bilingualError(
        "Database not configured",
        "قاعدة البيانات غير مهيأة — تحقق من NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_KEY",
      ),
    };
    if (process.env.NODE_ENV === "development") {
      body.debug = { message: e instanceof Error ? e.message : String(e) };
    }
    return NextResponse.json(body, { status: 503 });
  }

  let data: RawOrder[] | null = null;
  let lastError: { message: string; code?: string; details?: string; hint?: string } | null = null;

  for (const sel of SELECT_ATTEMPTS) {
    const res = await supabase
      .from("orders")
      .select(sel)
      .order("created_at", { ascending: false })
      .limit(500);
    if (!res.error) {
      data = ((res.data as unknown) as RawOrder[] | null) ?? [];
      lastError = null;
      break;
    }
    lastError = {
      message: res.error.message,
      code: res.error.code,
      details: res.error.details,
      hint: res.error.hint,
    };
    if (!isMissingColumnError(res.error)) {
      break;
    }
  }

  if (lastError || data === null) {
    const err = lastError ?? { message: "Unknown Supabase error" };
    console.error("[api/admin/payments/summary] Supabase:", err);
    const body: Record<string, unknown> = {
      ...bilingualError("Database error", "خطأ في قاعدة البيانات"),
    };
    if (process.env.NODE_ENV === "development") {
      body.debug = {
        message: err.message,
        code: err.code,
        hint: err.hint,
      };
    }
    return NextResponse.json(body, { status: 500 });
  }

  const rows: PaymentTransactionRow[] = data.map((raw) => normalizeRow(raw));

  const byStatus = rows.reduce<Record<string, number>>((acc, r) => {
    const k = r.payment_status ?? "unknown";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  const paidCount = byStatus.paid ?? 0;
  const failedCount = byStatus.failed ?? 0;
  const refundedCount = byStatus.refunded ?? 0;
  const unpaidCount = byStatus.unpaid ?? 0;
  const totalCaptured = rows
    .filter((r) => r.payment_status === "paid")
    .reduce((s, r) => s + r.total_egp, 0);
  const withTx = rows.filter((r) => Boolean(r.paymob_transaction_id)).length;
  const settled = paidCount + failedCount;
  const success_rate_pct =
    settled === 0 ? 0 : Math.round((paidCount / settled) * 1000) / 10;
  const avg_paid_ticket_egp =
    paidCount === 0 ? 0 : Math.round((totalCaptured / paidCount) * 100) / 100;

  const payload: PaymentSummaryResponse = {
    kpis: {
      total_captured_egp: Math.round(totalCaptured * 100) / 100,
      paid_count: paidCount,
      failed_count: failedCount,
      refunded_count: refundedCount,
      unpaid_count: unpaidCount,
      total_transactions: rows.length,
      success_rate_pct,
      avg_paid_ticket_egp,
      rows_with_gateway_tx: withTx,
    },
    by_status: byStatus,
    daily_trend: buildDailyTrend(rows),
    method_mix: buildMethodMix(rows),
    gateway_health: buildGatewayHealth(rows),
    recent: rows.slice(0, 200),
    meta: {
      fetched_at: new Date().toISOString(),
      row_count: rows.length,
    },
  };

  return NextResponse.json(payload);
}

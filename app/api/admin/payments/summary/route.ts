import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";
import {
  buildDailyTrend,
  buildGatewayHealth,
  buildMethodMix,
} from "@/lib/payments/build-payment-analytics";
import { loadPaymentOrdersForSummary } from "@/lib/payments/load-payment-orders";
import type { PaymentSummaryResponse } from "@/lib/payments/payment-summary-types";

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

  const loaded = await loadPaymentOrdersForSummary(supabase, 500);

  if (!loaded.ok) {
    const err = loaded.error;
    console.error("[api/admin/payments/summary] Supabase:", err);
    const body: Record<string, unknown> = {
      ...bilingualError("Database error", "خطأ في قاعدة البيانات"),
      code: "orders_read_failed",
    };
    if (process.env.NODE_ENV === "development") {
      body.debug = {
        message: err.message,
        code: err.code,
        hint: err.hint,
        migrate_hint: "npm run supabase:ensure-schema",
      };
    }
    return NextResponse.json(body, { status: 500 });
  }

  const rows = loaded.rows;

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

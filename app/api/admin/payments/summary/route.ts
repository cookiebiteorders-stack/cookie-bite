import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";

export async function GET() {
  await requireAdminAccess("payments");
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("total_egp,payment_status,payment_method,paymob_transaction_id,created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    return NextResponse.json(
      bilingualError("Database error", "خطأ في قاعدة البيانات"),
      { status: 500 },
    );
  }

  const rows = data ?? [];
  const byStatus = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.payment_status ?? "unknown"] = (acc[r.payment_status ?? "unknown"] ?? 0) + 1;
    return acc;
  }, {});
  const totalCaptured = rows
    .filter((r) => r.payment_status === "paid")
    .reduce((s, r) => s + Number(r.total_egp || 0), 0);
  const withTx = rows.filter((r) => Boolean(r.paymob_transaction_id)).length;

  return NextResponse.json({
    kpis: {
      total_captured_egp: totalCaptured,
      paid_count: byStatus.paid ?? 0,
      failed_count: byStatus.failed ?? 0,
      refunded_count: byStatus.refunded ?? 0,
      rows_with_gateway_tx: withTx,
    },
    by_status: byStatus,
    recent: rows.slice(0, 50),
  });
}


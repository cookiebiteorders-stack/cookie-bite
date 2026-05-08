import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";

export async function GET() {
  await requireAdminAccess("invoices");
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id,order_code,order_number,total_egp,payment_status,status,created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    return NextResponse.json(
      bilingualError("Database error", "خطأ في قاعدة البيانات"),
      { status: 500 },
    );
  }

  const invoices = (data ?? []).map((o) => ({
    id: o.id,
    invoice_number: `INV-${String(o.order_number).padStart(8, "0")}`,
    order_code: o.order_code,
    amount_egp: o.total_egp,
    payment_status: o.payment_status,
    order_status: o.status,
    issue_date: o.created_at,
  }));

  return NextResponse.json({ invoices });
}


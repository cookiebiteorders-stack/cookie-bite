import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  requireAdminAccess,
  requireWritePermission,
} from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { bilingualError } from "@/lib/validations";

const expenseSchema = z.object({
  title: z.string().min(2).max(200),
  category: z.string().min(2).max(80).default("operations"),
  amount_egp: z.number().positive(),
  expense_date: z.string().date(),
  notes: z.string().max(1000).optional(),
});

export async function GET() {
  await requireAdminAccess("financial");
  const supabase = createSupabaseAdminClient();

  const now = new Date();
  const d30 = new Date(now);
  d30.setDate(d30.getDate() - 30);

  const [{ data: orders }, { data: expenses }] = await Promise.all([
    supabase.from("orders").select("total_egp").gte("created_at", d30.toISOString()),
    supabase.from("expenses").select("amount_egp,category,expense_date"),
  ]);

  if (!orders || !expenses) {
    return NextResponse.json(
      bilingualError("Could not load financial summary", "تعذر تحميل الملخص المالي"),
      { status: 500 },
    );
  }

  const revenue30 = orders.reduce((s, o) => s + Number(o.total_egp || 0), 0);
  const expensesTotal = expenses.reduce((s, e) => s + Number(e.amount_egp || 0), 0);

  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    const key = e.category || "other";
    acc[key] = (acc[key] ?? 0) + Number(e.amount_egp || 0);
    return acc;
  }, {});

  return NextResponse.json({
    revenue_30d_egp: revenue30,
    expenses_total_egp: expensesTotal,
    net_egp: revenue30 - expensesTotal,
    expenses_by_category: byCategory,
    expenses,
  });
}

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("financial");
  requireWritePermission(actor);

  const parsed = expenseSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid payload", "بيانات غير صالحة"),
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      ...parsed.data,
      created_by: actor.user_id,
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      bilingualError("Failed to create expense", "فشل إضافة المصروف"),
      { status: 500 },
    );
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "financial.expense_create",
    module: "financial",
    entity_id: data.id,
    after: data,
    request: req,
  });

  return NextResponse.json({ ok: true, expense: data });
}


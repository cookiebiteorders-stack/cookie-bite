import { NextRequest, NextResponse } from "next/server";
import { formatISO } from "date-fns";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  requireAdminAccess,
  requireWritePermission,
} from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { bilingualError } from "@/lib/validations";
import { parseFinancialRange, previousPeriod } from "@/lib/financial/range-from-request";
import {
  buildComparisonBlock,
  buildFinancialPayload,
  summarizeExpensesForRange,
  summarizeOrdersForRange,
  type OrderPaidRow,
} from "@/lib/financial/build-financial-payload";
import type { ExpenseRow, FinancialSummaryResponse } from "@/lib/financial/types";

const expenseSchema = z.object({
  title: z.string().min(2).max(200),
  category: z.string().min(2).max(80).default("operations"),
  amount_egp: z.number().positive(),
  expense_date: z.string().date(),
  notes: z.string().max(1000).optional(),
});

type RawOrder = Record<string, unknown>;
type RawExpense = Record<string, unknown>;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeExpense(raw: RawExpense): ExpenseRow {
  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? ""),
    category: String(raw.category ?? "operations"),
    amount_egp: num(raw.amount_egp),
    expense_date: String(raw.expense_date ?? "").slice(0, 10),
    notes: raw.notes == null || raw.notes === "" ? null : String(raw.notes),
    created_at: raw.created_at == null ? undefined : String(raw.created_at),
  };
}

export async function GET(req: NextRequest) {
  await requireAdminAccess("financial");
  const supabase = createSupabaseAdminClient();

  const { preset, from, to } = parseFinancialRange(req.nextUrl.searchParams);
  const compare = req.nextUrl.searchParams.get("compare") === "1";

  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  const fromDateStr = formatISO(from, { representation: "date" });
  const toDateStr = formatISO(to, { representation: "date" });

  const [ordersRes, expensesRes] = await Promise.all([
    supabase
      .from("orders")
      .select("total_egp,created_at,payment_status")
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: false })
      .limit(20_000),
    supabase
      .from("expenses")
      .select("*")
      .gte("expense_date", fromDateStr)
      .lte("expense_date", toDateStr)
      .order("expense_date", { ascending: false })
      .limit(10_000),
  ]);

  if (ordersRes.error) {
    console.error("[financial/summary] orders", ordersRes.error);
    const body: Record<string, unknown> = {
      ...bilingualError("Could not load financial summary", "تعذر تحميل الملخص المالي"),
    };
    if (process.env.NODE_ENV === "development") {
      body.debug = { message: ordersRes.error.message, code: ordersRes.error.code };
    }
    return NextResponse.json(body, { status: 500 });
  }

  if (expensesRes.error) {
    console.error("[financial/summary] expenses", expensesRes.error);
    const body: Record<string, unknown> = {
      ...bilingualError("Could not load financial summary", "تعذر تحميل الملخص المالي"),
    };
    if (process.env.NODE_ENV === "development") {
      body.debug = { message: expensesRes.error.message, code: expensesRes.error.code };
    }
    return NextResponse.json(body, { status: 500 });
  }

  const ordersPaid = ((ordersRes.data as unknown) as OrderPaidRow[] | null) ?? [];
  const expensesRaw = ((expensesRes.data as unknown) as RawExpense[] | null) ?? [];
  const expenses = expensesRaw.map((r) => normalizeExpense(r));

  let prevBlock = null as FinancialSummaryResponse["comparison"];
  if (compare) {
    const prev = previousPeriod(from, to);
    const [oPrev, ePrev] = await Promise.all([
      supabase
        .from("orders")
        .select("total_egp,created_at,payment_status")
        .gte("created_at", prev.from.toISOString())
        .lte("created_at", prev.to.toISOString())
        .limit(20_000),
      supabase
        .from("expenses")
        .select("*")
        .gte("expense_date", formatISO(prev.from, { representation: "date" }))
        .lte("expense_date", formatISO(prev.to, { representation: "date" }))
        .limit(10_000),
    ]);
    if (!oPrev.error && !ePrev.error) {
      const op = ((oPrev.data as unknown) as OrderPaidRow[] | null) ?? [];
      const ep = ((ePrev.data as unknown) as RawExpense[] | null) ?? [];
      const expPrev = ep.map((r) => normalizeExpense(r));
      const revP = summarizeOrdersForRange(op, prev.from, prev.to).revenue;
      const expP = summarizeExpensesForRange(expPrev, prev.from, prev.to);
      prevBlock = buildComparisonBlock(prev.label, revP, expP);
    }
  }

  const payload = buildFinancialPayload({
    preset,
    from,
    to,
    ordersPaid,
    expenses,
    compare,
    prevBlock,
  });

  return NextResponse.json(payload);
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

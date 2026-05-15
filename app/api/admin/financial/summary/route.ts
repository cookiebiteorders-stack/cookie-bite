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
import {
  fetchFinancialExpenses,
  fetchFinancialOrders,
  normalizeExpenseRow,
} from "@/lib/financial/fetch-financial-data";

const expenseSchema = z.object({
  title: z.string().min(2).max(200),
  category: z.string().min(2).max(80).default("operations"),
  amount_egp: z.number().positive(),
  expense_date: z.string().date(),
  notes: z.string().max(1000).optional(),
});

export async function GET(req: NextRequest) {
  await requireAdminAccess("financial");

  let supabase: ReturnType<typeof createSupabaseAdminClient>;
  try {
    supabase = createSupabaseAdminClient();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        ...bilingualError("Could not load financial summary", "تعذر تحميل الملخص المالي"),
        details: message,
        ...(process.env.NODE_ENV === "development" ? { debug: { message } } : {}),
      },
      { status: 503 },
    );
  }

  const { preset, from, to } = parseFinancialRange(req.nextUrl.searchParams);
  const compare = req.nextUrl.searchParams.get("compare") === "1";

  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  const fromDateStr = formatISO(from, { representation: "date" });
  const toDateStr = formatISO(to, { representation: "date" });

  const metaWarnings: string[] = [];
  let ordersPaid: OrderPaidRow[];
  let expenses: ExpenseRow[];

  try {
    const [ordersBundle, expenseBundle] = await Promise.all([
      fetchFinancialOrders(supabase, fromIso, toIso),
      fetchFinancialExpenses(supabase, fromDateStr, toDateStr),
    ]);
    ordersPaid = ordersBundle.rows;
    expenses = expenseBundle.rows;
    metaWarnings.push(...ordersBundle.warnings, ...expenseBundle.warnings);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[financial/summary] fetch:", message);
    const body: Record<string, unknown> = {
      ...bilingualError("Could not load financial summary", "تعذر تحميل الملخص المالي"),
      details: message,
    };
    if (process.env.NODE_ENV === "development") {
      body.debug = { message };
    }
    return NextResponse.json(body, { status: 500 });
  }

  let prevBlock = null as FinancialSummaryResponse["comparison"];
  if (compare) {
    const prev = previousPeriod(from, to);
    const pf = formatISO(prev.from, { representation: "date" });
    const pt = formatISO(prev.to, { representation: "date" });
    try {
      const [oPrev, ePrev] = await Promise.all([
        fetchFinancialOrders(supabase, prev.from.toISOString(), prev.to.toISOString()),
        fetchFinancialExpenses(supabase, pf, pt),
      ]);
      const op = oPrev.rows;
      const expPrev = ePrev.rows;
      const revP = summarizeOrdersForRange(op, prev.from, prev.to).revenue;
      const expP = summarizeExpensesForRange(expPrev, prev.from, prev.to);
      prevBlock = buildComparisonBlock(prev.label, revP, expP);
    } catch {
      /* مقارنة الفترة السابقة اختيارية — لا تُفشل الصفحة */
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
    metaWarnings,
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

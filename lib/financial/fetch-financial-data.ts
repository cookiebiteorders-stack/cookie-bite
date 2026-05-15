import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExpenseRow } from "@/lib/financial/types";
import type { OrderPaidRow } from "@/lib/financial/build-financial-payload";

type QueryErr = { message?: string; code?: string } | null;

export function isFinancialSchemaOrTableError(err: QueryErr): boolean {
  if (!err) return false;
  const m = (err.message ?? "").toLowerCase();
  return (
    err.code === "42703" ||
    err.code === "PGRST204" ||
    err.code === "PGRST205" ||
    err.code === "42P01" ||
    (m.includes("column") && m.includes("does not exist")) ||
    m.includes("could not find the table") ||
    (m.includes("relation") && m.includes("does not exist"))
  );
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

type RawExpense = Record<string, unknown>;

export function normalizeExpenseRow(raw: RawExpense): ExpenseRow {
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

/**
 * طلبات الفترة المالية مع محاولات أعمدة متعددة (total_egp vs total، payment_status اختياري).
 */
export async function fetchFinancialOrders(
  supabase: SupabaseClient,
  fromIso: string,
  toIso: string,
): Promise<{ rows: OrderPaidRow[]; warnings: string[] }> {
  const attempts: { sel: string; assumePaidIfNoStatus: boolean }[] = [
    { sel: "total_egp,created_at,payment_status", assumePaidIfNoStatus: false },
    { sel: "total,created_at,payment_status", assumePaidIfNoStatus: false },
    { sel: "total_egp,created_at", assumePaidIfNoStatus: true },
    { sel: "total,created_at", assumePaidIfNoStatus: true },
  ];

  const warnings: string[] = [];
  let lastMsg = "orders query failed";

  for (const { sel, assumePaidIfNoStatus } of attempts) {
    const res = await supabase
      .from("orders")
      .select(sel)
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: false })
      .limit(20_000);

    if (!res.error) {
      const rawRows = ((res.data ?? []) as unknown) as Record<string, unknown>[];
      const rows: OrderPaidRow[] = rawRows.map((raw) => ({
        total_egp: num(raw.total_egp ?? raw.total),
        created_at: String(raw.created_at ?? ""),
        payment_status: assumePaidIfNoStatus
          ? "paid"
          : raw.payment_status == null
            ? null
            : String(raw.payment_status),
      }));
      if (assumePaidIfNoStatus) {
        warnings.push(
          "payment_status column unavailable — revenue counts all orders in range as paid (approximation).",
        );
      }
      if (sel.startsWith("total,")) {
        warnings.push("using legacy total column for order amounts.");
      }
      return { rows, warnings };
    }

    lastMsg = res.error.message ?? lastMsg;
    if (!isFinancialSchemaOrTableError(res.error)) {
      throw new Error(lastMsg);
    }
  }

  throw new Error(lastMsg);
}

/**
 * مصروفات الفترة؛ إن غاب الجدول أو المخطط يُرجع مصفوفة فارغة بدل إسقاط لوحة المالية بالكامل.
 */
export async function fetchFinancialExpenses(
  supabase: SupabaseClient,
  fromDateStr: string,
  toDateStr: string,
): Promise<{ rows: ExpenseRow[]; warnings: string[] }> {
  const res = await supabase
    .from("expenses")
    .select("*")
    .gte("expense_date", fromDateStr)
    .lte("expense_date", toDateStr)
    .order("expense_date", { ascending: false })
    .limit(10_000);

  if (!res.error) {
    const raw = ((res.data as unknown) as RawExpense[] | null) ?? [];
    return { rows: raw.map((r) => normalizeExpenseRow(r)), warnings: [] };
  }

  if (isFinancialSchemaOrTableError(res.error)) {
    return {
      rows: [],
      warnings: [`Expenses unavailable (${res.error.code ?? "schema"}): ${res.error.message}`],
    };
  }

  throw new Error(res.error.message ?? "expenses query failed");
}

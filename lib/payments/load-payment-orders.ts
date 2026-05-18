import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaymentTransactionRow } from "@/lib/payments/payment-summary-types";

export type RawPaymentOrder = Record<string, unknown>;

/** من الأحدث إلى الأبسط — يتخطى أعمدة ناقصة بعد ترحيلات غير مكتملة. */
const SELECT_ATTEMPTS = [
  "id,order_code,guest_email,user_id,total_egp,payment_status,payment_method,paymob_transaction_id,paymob_accept_order_id,created_at",
  "id,order_code,guest_email,user_id,total_egp,payment_status,payment_method,paymob_transaction_id,created_at",
  "id,order_code,guest_email,total_egp,payment_status,payment_method,paymob_transaction_id,created_at",
  "id,total_egp,payment_status,payment_method,paymob_transaction_id,created_at",
  "id,total_egp,payment_status,payment_method,created_at",
  "id,order_code,guest_email,user_id,total_egp,payment_method,paymob_transaction_id,paymob_accept_order_id,created_at",
  "id,order_code,guest_email,total_egp,payment_method,paymob_transaction_id,created_at",
  "id,total_egp,payment_method,paymob_transaction_id,paymob_accept_order_id,created_at",
  "id,total_egp,payment_method,paymob_transaction_id,created_at",
  "id,total_egp,payment_method,status,created_at",
  "id,total_egp,payment_method,created_at",
  "id,total_egp,status,created_at",
  "id,total_egp,created_at",
] as const;

export type LoadPaymentOrdersResult =
  | { ok: true; rows: PaymentTransactionRow[]; selectUsed: string }
  | {
      ok: false;
      error: { message: string; code?: string; details?: string; hint?: string };
    };

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

/** يستنتج حالة الدفع عند غياب عمود payment_status (مخطط قديم). */
export function derivePaymentStatus(raw: RawPaymentOrder): string {
  if (raw.payment_status != null && String(raw.payment_status).trim() !== "") {
    return String(raw.payment_status);
  }
  const orderStatus = String(raw.status ?? "").toLowerCase();
  if (orderStatus === "refunded") return "refunded";
  if (orderStatus === "cancelled") return "failed";
  if (raw.paymob_transaction_id != null && String(raw.paymob_transaction_id).trim() !== "") {
    return "paid";
  }
  return "unpaid";
}

export function normalizePaymentOrderRow(raw: RawPaymentOrder): PaymentTransactionRow {
  return {
    id: String(raw.id ?? ""),
    order_code: raw.order_code == null ? null : String(raw.order_code),
    guest_email: raw.guest_email == null ? null : String(raw.guest_email),
    user_id: raw.user_id == null ? null : String(raw.user_id),
    total_egp: num(raw.total_egp ?? raw.total),
    payment_status: derivePaymentStatus(raw),
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

export async function loadPaymentOrdersForSummary(
  supabase: SupabaseClient,
  limit = 500,
): Promise<LoadPaymentOrdersResult> {
  let data: RawPaymentOrder[] | null = null;
  let selectUsed: string | null = null;
  let lastError: { message: string; code?: string; details?: string; hint?: string } | null =
    null;

  for (const sel of SELECT_ATTEMPTS) {
    const res = await supabase
      .from("orders")
      .select(sel)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (!res.error) {
      data = ((res.data as unknown) as RawPaymentOrder[] | null) ?? [];
      selectUsed = sel;
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

  if (lastError || data === null || !selectUsed) {
    return {
      ok: false,
      error: lastError ?? { message: "Unknown Supabase error" },
    };
  }

  return {
    ok: true,
    rows: data.map((raw) => normalizePaymentOrderRow(raw)),
    selectUsed,
  };
}

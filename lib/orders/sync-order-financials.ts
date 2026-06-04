import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { EnsuredInvoice } from "@/lib/invoices/ensure-order-invoice";
import { ORDER_FOR_INVOICE_SELECT } from "@/lib/invoices/order-select";
import {
  resolveInvoiceNumberForOrder,
  resolveStoredInvoiceNumber,
  type OrderInvoiceIdentity,
} from "@/lib/invoices/resolve-invoice-number";

export type SyncOrderFinancialsResult = {
  invoice: EnsuredInvoice | null;
  paymentId: string | null;
  linked: boolean;
};

function paymentProvider(method: string | null | undefined): string {
  const m = (method ?? "").toLowerCase();
  if (m.includes("paymob") || m === "card") return "paymob";
  if (m === "cod") return "cod";
  return m || "other";
}

/**
 * يربط الطلب بالفاتورة والدفع: order_id، رقم فاتورة مشتق من الطلب، سجل payment عند paid.
 */
export async function syncOrderFinancialRecords(
  orderId: string,
): Promise<SyncOrderFinancialsResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return { invoice: null, paymentId: null, linked: false };
  }

  const supabase = createSupabaseAdminClient();
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select(ORDER_FOR_INVOICE_SELECT)
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order) {
    console.error("[syncOrderFinancials] order", orderErr?.message ?? "not found");
    return { invoice: null, paymentId: null, linked: false };
  }

  const orderRow = order as OrderInvoiceIdentity & {
    total_egp: number;
    payment_status: string;
    payment_method: string | null;
    paymob_transaction_id: string | null;
  };

  const targetInvoiceNumber = resolveInvoiceNumberForOrder(orderRow);
  const amountEgp = Number(orderRow.total_egp ?? 0);
  const isPaid = String(orderRow.payment_status ?? "").toLowerCase() === "paid";

  let invoice: EnsuredInvoice | null = null;

  const { data: existingInv } = await supabase
    .from("invoices")
    .select("id, amount, status, issued_at, created_at, invoice_number")
    .eq("order_id", orderId)
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingInv) {
    const issuedAt = String(existingInv.issued_at ?? existingInv.created_at);
    const invoiceNumber = resolveStoredInvoiceNumber(existingInv, orderRow);

    if (
      (!existingInv.invoice_number || existingInv.invoice_number !== targetInvoiceNumber) &&
      targetInvoiceNumber
    ) {
      await supabase
        .from("invoices")
        .update({ invoice_number: targetInvoiceNumber })
        .eq("id", existingInv.id);
    }

    if (isPaid && existingInv.status !== "paid") {
      await supabase.from("invoices").update({ status: "paid" }).eq("id", existingInv.id);
    }

    invoice = {
      id: String(existingInv.id),
      invoiceNumber,
      amountEgp: Number(existingInv.amount),
      status: isPaid ? "paid" : String(existingInv.status),
      issuedAt,
      created: false,
    };
  } else if (isPaid) {
    const insertPayload: Record<string, unknown> = {
      order_id: orderId,
      amount: amountEgp,
      status: "paid",
      invoice_number: targetInvoiceNumber,
    };

    const { data: created, error: invErr } = await supabase
      .from("invoices")
      .insert(insertPayload)
      .select("id, amount, status, issued_at, invoice_number")
      .single();

    if (invErr || !created) {
      const fallback = { ...insertPayload };
      delete fallback.invoice_number;
      const { data: created2, error: invErr2 } = await supabase
        .from("invoices")
        .insert(fallback)
        .select("id, amount, status, issued_at")
        .single();
      if (invErr2 || !created2) {
        console.error("[syncOrderFinancials] invoice insert", invErr?.message, invErr2?.message);
      } else {
        const issuedAt = String(created2.issued_at);
        invoice = {
          id: String(created2.id),
          invoiceNumber: resolveStoredInvoiceNumber(created2, orderRow),
          amountEgp: Number(created2.amount),
          status: String(created2.status),
          issuedAt,
          created: true,
        };
      }
    } else {
      const issuedAt = String(created.issued_at);
      invoice = {
        id: String(created.id),
        invoiceNumber: resolveStoredInvoiceNumber(created, orderRow),
        amountEgp: Number(created.amount),
        status: String(created.status),
        issuedAt,
        created: true,
      };
    }
  }

  let paymentId: string | null = null;
  if (isPaid) {
    const { data: existingPay } = await supabase
      .from("payments")
      .select("id")
      .eq("order_id", orderId)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPay?.id) {
      paymentId = String(existingPay.id);
    } else {
      const { data: payRow, error: payErr } = await supabase
        .from("payments")
        .insert({
          order_id: orderId,
          amount: amountEgp,
          method: orderRow.payment_method,
          transaction_id: orderRow.paymob_transaction_id,
          status: "paid",
          provider: paymentProvider(orderRow.payment_method),
          metadata: {
            invoice_id: invoice?.id ?? null,
            invoice_number: invoice?.invoiceNumber ?? targetInvoiceNumber,
          },
        })
        .select("id")
        .single();

      if (payErr) {
        console.error("[syncOrderFinancials] payment insert", payErr.message);
      } else if (payRow?.id) {
        paymentId = String(payRow.id);
      }
    }
  }

  return {
    invoice,
    paymentId,
    linked: Boolean(invoice?.id && orderId),
  };
}

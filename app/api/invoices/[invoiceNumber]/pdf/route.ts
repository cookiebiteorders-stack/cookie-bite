import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { generateInvoicePdfBuffer } from "@/lib/invoices/generate-invoice-pdf";
import { toInvoiceViewModel } from "@/lib/invoices/to-invoice-view-model";
import { bilingualError } from "@/lib/validations";

type InvoiceStatus = "paid" | "pending" | "failed" | "refunded";

type InvoiceDetailPayload = {
  id: string;
  invoice_number: string;
  amount_egp: number;
  status: InvoiceStatus;
  issued_at: string;
  customer_name: string | null;
  customer_email: string | null;
  order: {
    id: string | null;
    order_code: string | null;
    status: string | null;
    items: Array<{
      id: string;
      product_name: string;
      quantity: number;
      unit_price_egp: number;
      total_price_egp: number | null;
    }>;
    subtotal_egp: number | null;
    discount_amount_egp: number | null;
    delivery_fee_egp: number | null;
    notes: string | null;
    shipping_address: Record<string, unknown> | null;
  };
  payment: {
    id: string | null;
    method: string | null;
    transaction_id: string | null;
    status: string | null;
    paid_at: string | null;
  };
};

/** Reuses the JSON invoice API, then returns a styled PDF attachment. */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ invoiceNumber: string }> },
) {
  const { invoiceNumber } = await context.params;
  const base = new URL(request.url);
  const jsonUrl = new URL(
    `/api/invoices/${encodeURIComponent(invoiceNumber ?? "")}`,
    `${base.protocol}//${base.host}`,
  );

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      bilingualError("Unauthorized", "غير مصرح"),
      { status: 401 },
    );
  }

  const cookie = request.headers.get("cookie");
  const jsonRes = await fetch(jsonUrl.toString(), {
    headers: cookie ? { cookie } : undefined,
    cache: "no-store",
  });

  if (!jsonRes.ok) {
    const err = (await jsonRes.json().catch(() => null)) as {
      error?: { en?: string };
    } | null;
    return NextResponse.json(
      err ?? bilingualError("Invoice not found", "الفاتورة غير موجودة"),
      { status: jsonRes.status },
    );
  }

  const data = (await jsonRes.json()) as { invoice?: InvoiceDetailPayload };
  if (!data.invoice) {
    return NextResponse.json(
      bilingualError("Invoice not found", "الفاتورة غير موجودة"),
      { status: 404 },
    );
  }

  const vm = toInvoiceViewModel(data.invoice as Parameters<typeof toInvoiceViewModel>[0]);
  const pdf = await generateInvoicePdfBuffer(vm);
  const filename = `${data.invoice.invoice_number.replace(/[^\w.-]+/g, "_")}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

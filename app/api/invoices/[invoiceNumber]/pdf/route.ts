import { NextRequest, NextResponse } from "next/server";
import { generateInvoicePdfBuffer } from "@/lib/invoices/generate-invoice-pdf";
import { toInvoiceViewModel } from "@/lib/invoices/to-invoice-view-model";
import { GET as getInvoiceJson } from "../route";

/** Returns a styled PDF attachment for the invoice (same auth as JSON route). */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ invoiceNumber: string }> },
) {
  const jsonRes = await getInvoiceJson(request, context);

  if (!jsonRes.ok) {
    return jsonRes;
  }

  const data = (await jsonRes.json()) as {
    invoice?: Parameters<typeof toInvoiceViewModel>[0];
  };

  if (!data.invoice) {
    return NextResponse.json({ error: { en: "Invoice not found", ar: "الفاتورة غير موجودة" } }, { status: 404 });
  }

  const vm = toInvoiceViewModel(data.invoice);
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

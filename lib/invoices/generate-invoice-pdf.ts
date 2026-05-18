import type { InvoiceViewModel } from "@/components/invoices/invoice-view";
import { generateInvoicePdfBufferPdfkit } from "@/lib/invoices/generate-invoice-pdf-pdfkit";
import { renderInvoicePrintHtml } from "@/lib/invoices/render-invoice-print-html";
import { htmlToPdfBuffer } from "@/lib/print/html-to-pdf-buffer";

/**
 * Generates an invoice PDF that matches the on-screen branded design.
 * Uses HTML→PDF (Playwright) when available; falls back to PDFKit.
 */
export async function generateInvoicePdfBuffer(vm: InvoiceViewModel): Promise<Buffer> {
  try {
    const html = renderInvoicePrintHtml(vm);
    const fromHtml = await htmlToPdfBuffer(html, { format: "A4", printBackground: true });
    if (fromHtml && fromHtml.length > 500) {
      return fromHtml;
    }
  } catch (e) {
    console.warn("[invoice-pdf] HTML render failed, using PDFKit fallback", e);
  }
  return generateInvoicePdfBufferPdfkit(vm);
}

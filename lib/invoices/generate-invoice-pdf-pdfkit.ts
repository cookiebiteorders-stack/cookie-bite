import PDFDocument from "pdfkit";
import type { InvoiceViewModel } from "@/components/invoices/invoice-view";
import { BRAND } from "@/lib/brand";

function money(n: number): string {
  return `${n.toLocaleString("en-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;
}

/** PDFKit fallback when HTML→PDF engine is unavailable. */
export function generateInvoicePdfBufferPdfkit(vm: InvoiceViewModel): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const terracotta = "#e8782a";
    doc.fillColor(terracotta).fontSize(22).text("Cookie Bite", { continued: false });
    doc.fillColor("#333").fontSize(10).text(BRAND.location);
    doc.moveDown(0.5);
    doc.fontSize(16).fillColor("#1a1a1a").text(`Invoice ${vm.invoice_number}`, { underline: false });
    doc.fontSize(10).fillColor("#666");
    doc.text(`Issued: ${new Date(vm.issued_at).toLocaleDateString("en-GB")}`);
    if (vm.order_number) doc.text(`Order: ${vm.order_number}`);
    doc.text(`Status: ${vm.status.toUpperCase()}`);

    doc.moveDown(1);
    doc.fillColor("#1a1a1a").fontSize(11).text("Bill to", { underline: true });
    doc.fontSize(10).fillColor("#333");
    doc.text(vm.customer_name ?? "Customer");
    if (vm.customer_email) doc.text(vm.customer_email);
    if (vm.customer_phone) doc.text(vm.customer_phone);
    for (const line of vm.customer_address_lines ?? []) {
      doc.text(line);
    }

    doc.moveDown(1);
    const tableTop = doc.y;
    doc.fontSize(9).fillColor("#fff");
    doc.rect(48, tableTop, 499, 18).fill(terracotta);
    doc.fillColor("#fff").text("Item", 52, tableTop + 5, { width: 280 });
    doc.text("Qty", 340, tableTop + 5, { width: 40, align: "right" });
    doc.text("Unit", 385, tableTop + 5, { width: 70, align: "right" });
    doc.text("Total", 460, tableTop + 5, { width: 80, align: "right" });

    let y = tableTop + 22;
    doc.fillColor("#333");
    for (const item of vm.items) {
      const lineTotal = item.total_price_egp ?? item.unit_price_egp * item.quantity;
      doc.text(item.product_name, 52, y, { width: 280 });
      doc.text(String(item.quantity), 340, y, { width: 40, align: "right" });
      doc.text(money(item.unit_price_egp), 385, y, { width: 70, align: "right" });
      doc.text(money(lineTotal), 460, y, { width: 80, align: "right" });
      y += 20;
      if (y > 700) {
        doc.addPage();
        y = 48;
      }
    }

    doc.moveDown(2);
    y = Math.max(y + 10, doc.y);
    const summaryX = 360;
    doc.fontSize(10).fillColor("#333");
    doc.text(`Subtotal: ${money(vm.subtotal_egp)}`, summaryX, y, { align: "right", width: 180 });
    y += 14;
    if ((vm.discount_amount_egp ?? 0) > 0) {
      doc.text(`Discount: −${money(vm.discount_amount_egp ?? 0)}`, summaryX, y, {
        align: "right",
        width: 180,
      });
      y += 14;
    }
    if ((vm.shipping_amount_egp ?? 0) > 0) {
      doc.text(`Delivery: ${money(vm.shipping_amount_egp ?? 0)}`, summaryX, y, {
        align: "right",
        width: 180,
      });
      y += 14;
    }
    doc.fontSize(12).fillColor(terracotta).text(`Total: ${money(vm.total_amount_egp)}`, summaryX, y, {
      align: "right",
      width: 180,
    });

    if (vm.payment_method) {
      doc.moveDown(1.5);
      doc.fontSize(9).fillColor("#666");
      doc.text(`Payment: ${vm.payment_method}`);
      if (vm.transaction_id) doc.text(`Transaction: ${vm.transaction_id}`);
    }

    doc.moveDown(2);
    doc.fontSize(8).fillColor("#999").text("Thank you for choosing Cookie Bite — hand-baked in New Cairo.", {
      align: "center",
    });

    doc.end();
  });
}

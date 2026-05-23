/** @jest-environment node */

import {
  buildOrderConfirmedWhatsAppBody,
  buildPaymentConfirmedWhatsAppBody,
} from "@/lib/whatsapp/send";
import { generateInvoicePdfBuffer } from "@/lib/invoices/generate-invoice-pdf";
import type { InvoiceViewModel } from "@/components/invoices/invoice-view";

jest.mock("@/lib/print/html-to-pdf-buffer", () => ({
  htmlToPdfBuffer: jest.fn().mockResolvedValue(null),
}));

describe("notification whatsapp bodies", () => {
  it("builds order confirmed message with track url", () => {
    const body = buildOrderConfirmedWhatsAppBody({
      customerName: "Ahmed Hassan",
      orderNumber: "1042",
      totalEgp: 520,
      trackUrl: "https://cookie-bite.com/account/orders",
    });
    expect(body).toContain("1042");
    expect(body).toContain("520");
    expect(body).toContain("account/orders");
  });

  it("builds payment confirmed message with invoice url", () => {
    const body = buildPaymentConfirmedWhatsAppBody({
      customerName: "Sara",
      orderNumber: "1042",
      totalEgp: 520,
      invoiceUrl: "https://cookie-bite.com/invoices/INV-TEST",
    });
    expect(body).toContain("INV-TEST");
    expect(body).toContain("دفعتك");
  });

  it("generates a non-empty invoice PDF buffer", async () => {
    const vm: InvoiceViewModel = {
      invoice_number: "INV-TEST",
      order_number: "#1",
      issued_at: new Date().toISOString(),
      status: "paid",
      customer_name: "Test",
      customer_email: "t@example.com",
      items: [
        {
          id: "1",
          product_name: "Cookie box",
          quantity: 1,
          unit_price_egp: 100,
          total_price_egp: 100,
        },
      ],
      subtotal_egp: 100,
      total_amount_egp: 100,
    };
    const buf = await generateInvoicePdfBuffer(vm);
    expect(buf.length).toBeGreaterThan(500);
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });
});

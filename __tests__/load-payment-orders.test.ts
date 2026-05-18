import { derivePaymentStatus, normalizePaymentOrderRow } from "@/lib/payments/load-payment-orders";

describe("derivePaymentStatus", () => {
  it("uses payment_status when present", () => {
    expect(derivePaymentStatus({ payment_status: "paid" })).toBe("paid");
  });

  it("infers paid from paymob_transaction_id when column missing", () => {
    expect(
      derivePaymentStatus({ paymob_transaction_id: "tx-123", status: "pending" }),
    ).toBe("paid");
  });

  it("maps refunded order status", () => {
    expect(derivePaymentStatus({ status: "refunded" })).toBe("refunded");
  });

  it("defaults to unpaid", () => {
    expect(derivePaymentStatus({ status: "pending" })).toBe("unpaid");
  });
});

describe("normalizePaymentOrderRow", () => {
  it("reads legacy total column", () => {
    const row = normalizePaymentOrderRow({
      id: "a",
      total: 150,
      payment_method: "card",
      created_at: "2026-01-01T00:00:00Z",
    });
    expect(row.total_egp).toBe(150);
    expect(row.payment_status).toBe("unpaid");
  });
});

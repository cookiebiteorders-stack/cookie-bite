import {
  computePaymobTransactionHmac,
  verifyPaymobTransactionHmac,
} from "@/lib/paymob/hmac";
import { resolvePaymobPaymentOutcome } from "@/lib/paymob/outcome";
import {
  buildPaymobIntentionBillingData,
  buildPaymobIntentionItems,
} from "@/lib/paymob/intention";

describe("Paymob HMAC", () => {
  const secret = "test_hmac_secret";
  const transaction = {
    amount_cents: 100000,
    created_at: "2024-06-13T11:33:44.592345",
    currency: "EGP",
    error_occured: false,
    has_parent_transaction: false,
    id: 192036465,
    integration_id: 4097558,
    is_3d_secure: true,
    is_auth: false,
    is_capture: false,
    is_refunded: false,
    is_standalone_payment: true,
    is_voided: false,
    order: { id: 217503754 },
    owner: 302852,
    pending: false,
    source_data: { pan: "2346", sub_type: "MasterCard", type: "card" },
    success: true,
  };

  it("accepts a matching HMAC", () => {
    const hmac = computePaymobTransactionHmac(transaction, secret);
    expect(verifyPaymobTransactionHmac(transaction, hmac, secret)).toBe(true);
  });

  it("rejects a tampered HMAC", () => {
    const hmac = computePaymobTransactionHmac(transaction, secret);
    expect(verifyPaymobTransactionHmac(transaction, `${hmac}ff`, secret)).toBe(false);
  });

  it("rejects empty secret or hmac", () => {
    expect(verifyPaymobTransactionHmac(transaction, "abc", "")).toBe(false);
    expect(verifyPaymobTransactionHmac(transaction, "", secret)).toBe(false);
  });
});

describe("Paymob payment outcome", () => {
  it("marks paid when success=true", () => {
    expect(resolvePaymobPaymentOutcome({ success: true, pending: false })).toEqual({
      payment_status: "paid",
      status: "confirmed",
      outcome: "paid",
    });
  });

  it("keeps unpaid while pending", () => {
    expect(resolvePaymobPaymentOutcome({ success: false, pending: true })).toEqual({
      payment_status: "unpaid",
      status: "pending",
      outcome: "pending",
    });
  });

  it("marks failed when not success and not pending", () => {
    expect(resolvePaymobPaymentOutcome({ success: false, pending: false })).toEqual({
      payment_status: "failed",
      status: "pending",
      outcome: "failed",
    });
  });
});

describe("Paymob intention helpers", () => {
  it("fills billing defaults for empty optional fields", () => {
    const billing = buildPaymobIntentionBillingData({
      name: "Sara",
      email: "",
      phone: "01123456789",
      street: "",
      city: "",
    });
    expect(billing.email).toBe("guest@cookiebite.local");
    expect(billing.first_name).toBe("Sara");
    expect(billing.last_name).toBe(".");
    expect(billing.phone_number).toBe("+201123456789");
    expect(billing.city).toBe("Cairo");
    expect(billing.street).toBe("NA");
    expect(billing.country).toBe("EG");
  });

  it("builds items that sum to amount cents", () => {
    const items = buildPaymobIntentionItems(
      [{ id: "cookie", name: "Cookie", unitPrice: 100, quantity: 2 }],
      45,
      20,
      30,
    );
    const sum = items.reduce((s, i) => s + i.amount * i.quantity, 0);
    expect(sum).toBe(100 * 2 * 100 - 20 * 100 + 45 * 100 + 30 * 100);
  });
});

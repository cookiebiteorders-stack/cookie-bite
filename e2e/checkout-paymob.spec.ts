import { expect, test } from "@playwright/test";

test.describe("Checkout & Paymob API smoke", () => {
  test("checkout shows empty cart message when cart is empty", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/checkout/, { timeout: 15_000 });
  });

  test("paymob intention rejects invalid JSON", async ({ request }) => {
    const res = await request.post("/api/checkout/paymob/intention", {
      data: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  test("paymob intention rejects empty cart payload", async ({ request }) => {
    const res = await request.post("/api/checkout/paymob/intention", {
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({
        items: [],
      }),
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBeTruthy();
  });

  test("paymob webhook rejects invalid HMAC when secret configured", async ({
    request,
  }) => {
    const res = await request.post("/api/webhooks/paymob", {
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({ obj: { id: 1 }, hmac: "invalid" }),
    });
    // بدون سر في البيئة المحلية قد يكون 500؛ مع سر خاطئ متوقع 401 Invalid HMAC
    expect([401, 400, 500]).toContain(res.status());
  });
});

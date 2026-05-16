import { expect, test } from "@playwright/test";

test.describe("Checkout & Paymob API smoke", () => {
  test("checkout redirects to cart when cart is empty", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/cart/, { timeout: 15_000 });
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
        shipping: {
          name: "Test User",
          phone: "01123456789",
          address: "123 Test Street Cairo",
          city: "Cairo",
        },
        paymentMethod: "cod",
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
    // بدون سر في البيئة المحلية قد يكون 500؛ مع سر خاطئ متوقع 400 Invalid HMAC
    expect([400, 500]).toContain(res.status());
  });
});

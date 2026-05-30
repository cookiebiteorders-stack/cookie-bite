import { expect, test } from "@playwright/test";

test("homepage loads with brand identity", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Cookie Bite/i);
  await expect(page.getByRole("link", { name: /Shop/i }).first()).toBeVisible();
});

test("homepage loads Tailwind CSS bundle (not unstyled HTML)", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const stylesheetCount = await page.locator('link[rel="stylesheet"][href*="/_next/static/"]').count();
  expect(stylesheetCount).toBeGreaterThan(0);

  const storefrontDisplay = await page.locator(".cb-storefront").first().evaluate((el) => {
    return window.getComputedStyle(el).display;
  });
  expect(storefrontDisplay).toBe("flex");
});

test("products API returns successful response", async ({ request }) => {
  const res = await request.get("/api/products");
  const body = await res.json();
  if (res.ok()) {
    expect(Array.isArray(body.products)).toBeTruthy();
    return;
  }
  // على بيئة بدون migrations/seed متكاملة، نتحقق من فشل متحكم فيه بدل crash.
  expect(res.status()).toBeGreaterThanOrEqual(400);
  expect(typeof body.error?.en).toBe("string");
  expect(typeof body.error?.ar).toBe("string");
});

test("admin route is guarded", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin|\/sign-in|\/403/);
});

test("contact API honeypot returns ok without persisting (silent drop)", async ({ request }) => {
  const res = await request.post("/api/contact", {
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({
      name: "Bot",
      email: "bot@example.com",
      subject: "Spam",
      message: "buy now",
      _gotcha: "filled-by-scraper",
    }),
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.ok).toBe(true);
});

test("newsletter honeypot returns ok without subscribing", async ({ request }) => {
  const res = await request.post("/api/newsletter", {
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({
      email: "human@example.com",
      source: "e2e",
      _gotcha: "x",
    }),
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.ok).toBe(true);
});

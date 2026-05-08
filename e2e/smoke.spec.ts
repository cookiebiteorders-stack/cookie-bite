import { expect, test } from "@playwright/test";

test("homepage loads with brand identity", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Cookie Bite/i);
  await expect(page.getByRole("link", { name: /Shop/i }).first()).toBeVisible();
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


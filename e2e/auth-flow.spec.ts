import { expect, test } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("sign-in page loads and has required elements", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page).toHaveTitle(/Sign In|تسجيل الدخول/i);
    
    // Check for email input
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toBeVisible();
    
    // Check for password input
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    await expect(passwordInput).toBeVisible();
  });

  test("sign-up page loads and has required elements", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page).toHaveTitle(/Sign Up|إنشاء حساب/i);
    
    // Check for email input
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toBeVisible();
    
    // Check for password input
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    await expect(passwordInput).toBeVisible();
  });

  test("forgot-password page loads", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page).toHaveTitle(/Forgot Password|نسيت كلمة المرور/i);
    
    // Check for email input
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toBeVisible();
  });

  test("account route redirects to sign-in when not authenticated", async ({ page }) => {
    await page.goto("/account");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("admin route redirects to sign-in when not authenticated", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

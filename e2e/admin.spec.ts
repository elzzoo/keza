import { test, expect } from "@playwright/test";

test.describe("/admin page", () => {
  test("shows login form when no secret provided", async ({ page }) => {
    await page.goto("/admin");
    // Should show the login form (not a dashboard)
    await expect(page.getByRole("heading", { name: /admin keza/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /accéder/i })).toBeVisible();
  });

  test("shows login form when wrong secret provided", async ({ page }) => {
    await page.goto("/admin?secret=wrong-secret-12345");
    await expect(page.getByRole("heading", { name: /admin keza/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /accéder/i })).toBeVisible();
  });

  test("login form has password input", async ({ page }) => {
    await page.goto("/admin");
    const input = page.locator('input[name="secret"]');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute("type", "password");
  });

  test("page is noindex", async ({ page }) => {
    await page.goto("/admin");
    const robots = await page.$eval(
      'meta[name="robots"]',
      (el) => el.getAttribute("content") ?? ""
    );
    expect(robots).toMatch(/noindex/i);
  });
});

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

  test("shows an error message when the wrong secret is submitted", async ({ page }) => {
    // Regression test: wrong secret used to redirect silently back to the
    // login form with zero feedback — a real user had no way to tell "wrong
    // password" from "the form didn't submit". See app/api/admin/session/route.ts.
    await page.goto("/admin");
    await page.locator('input[name="secret"]').fill("definitely-wrong-secret");
    await page.getByRole("button", { name: /accéder/i }).click();
    await expect(page.getByText(/secret incorrect/i)).toBeVisible();
  });

  test("does not show an error message on first visit", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText(/secret incorrect/i)).not.toBeVisible();
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

import { test, expect } from "@playwright/test";

test.describe("/flights/[route] page", () => {
  test("loads with route heading", async ({ page }) => {
    await page.goto("/flights/DSS-CDG");
    // Should contain the route code in the title or heading
    await expect(page).toHaveTitle(/DSS|CDG|Dakar|Paris/i);
  });

  test("shows search form pre-filled with route", async ({ page }) => {
    await page.goto("/flights/DSS-CDG");
    // Search form should show DSS and CDG
    await expect(page.getByText("DSS").first()).toBeVisible();
    await expect(page.getByText("CDG").first()).toBeVisible();
  });

  test("shows 'Suivre ce vol' alert section", async ({ page }) => {
    await page.goto("/flights/DSS-CDG");
    // Alert section should be visible
    await expect(
      page.getByText(/suivre ce vol|track this flight/i)
    ).toBeVisible();
  });

  test("alert form has email input", async ({ page }) => {
    await page.goto("/flights/DSS-CDG");
    // PriceAlertForm renders an email input
    const emailInput = page.getByPlaceholder(/email/i).first();
    await expect(emailInput).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";

test.describe("/programmes page", () => {
  test("loads with correct title", async ({ page }) => {
    await page.goto("/programmes");
    await expect(page).toHaveTitle(/programmes miles|meilleurs programmes/i);
  });

  test("shows program type filter tabs", async ({ page }) => {
    await page.goto("/programmes");
    await expect(page.getByRole("button", { name: /^tous$/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /airline/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /transfert/i })).toBeVisible();
  });

  test("shows at least one loyalty program (Flying Blue)", async ({ page }) => {
    await page.goto("/programmes");
    await expect(page.getByText("Flying Blue").first()).toBeVisible();
  });

  test("filter tab changes displayed programs", async ({ page }) => {
    await page.goto("/programmes");
    await page.getByRole("button", { name: /airline/i }).click();
    // After filter, Flying Blue (airline program) should still be visible
    await expect(page.getByText("Flying Blue").first()).toBeVisible();
  });
});

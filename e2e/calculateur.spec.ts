import { test, expect } from "@playwright/test";

test.describe("/calculateur page", () => {
  test("loads with correct title", async ({ page }) => {
    await page.goto("/calculateur");
    await expect(page).toHaveTitle(/calculateur.*miles|valeur.*miles/i);
  });

  test("shows miles range slider", async ({ page }) => {
    await page.goto("/calculateur");
    const slider = page.locator('input[type="range"]').first();
    await expect(slider).toBeVisible();
  });

  test("shows programme selector", async ({ page }) => {
    await page.goto("/calculateur");
    const select = page.locator("select").first();
    await expect(select).toBeVisible();
    // Flying Blue should be one of the options
    await expect(select).toContainText("Flying Blue");
  });

  test("displays estimated value in euros", async ({ page }) => {
    await page.goto("/calculateur");
    // The calculator shows a value in € or USD
    await expect(page.getByText(/€|eur/i).first()).toBeVisible();
  });

  test("shows reference table with programme rows", async ({ page }) => {
    await page.goto("/calculateur");
    // The reference table at the bottom lists programmes
    await expect(page.getByText("Flying Blue").first()).toBeVisible();
  });
});

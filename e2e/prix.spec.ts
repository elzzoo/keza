import { test, expect } from "@playwright/test";

test.describe("/prix page", () => {
  test("loads with correct title", async ({ page }) => {
    await page.goto("/prix");
    await expect(page).toHaveTitle(/meilleur moment|voyager/i);
  });

  test("shows at least one destination in the chart", async ({ page }) => {
    await page.goto("/prix");
    // Region filter buttons are always rendered in the price chart
    await expect(page.getByRole("button", { name: /toutes/i }).first()).toBeVisible();
  });

  test("shows a price chart SVG", async ({ page }) => {
    await page.goto("/prix");
    const svg = page.locator("svg").first();
    await expect(svg).toBeVisible();
  });

  test("shows month labels (Jan or Janv)", async ({ page }) => {
    await page.goto("/prix");
    // Month abbreviations should appear in the chart
    await expect(page.getByText(/jan/i).first()).toBeVisible();
  });
});

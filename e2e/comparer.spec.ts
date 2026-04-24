import { test, expect } from "@playwright/test";

test.describe("/comparer page", () => {
  test("loads with correct title", async ({ page }) => {
    await page.goto("/comparer");
    await expect(page).toHaveTitle(/comparer.*destinations|cash.*miles/i);
  });

  test("page contains 'destinations' content", async ({ page }) => {
    await page.goto("/comparer");
    // Page should mention destinations in some form
    await expect(page.getByText(/destinations/i).first()).toBeVisible();
  });

  test("loads comparison with URL params ?a=CDG&b=NRT", async ({ page }) => {
    await page.goto("/comparer?a=CDG&b=NRT");
    // Page is client-side rendered — wait for hydration
    await page.waitForLoadState("networkidle");
    // Comparison table renders flag+city in column headers — check via evaluate
    // (getByText finds hidden <option> elements first, so we check the DOM directly)
    const hasComparison = await page.evaluate(() => {
      const cells = document.querySelectorAll("th, td, div");
      const texts = [...cells].map((el) => el.textContent ?? "");
      return texts.some((t) => t.includes("Paris")) && texts.some((t) => t.includes("Tokyo"));
    });
    expect(hasComparison).toBe(true);
  });
});

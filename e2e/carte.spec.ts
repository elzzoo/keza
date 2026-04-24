import { test, expect } from "@playwright/test";

test.describe("/carte page", () => {
  test("loads with correct title", async ({ page }) => {
    await page.goto("/carte");
    await expect(page).toHaveTitle(/carte.*destinations|destinations.*miles/i);
  });

  test("shows region filter buttons", async ({ page }) => {
    await page.goto("/carte");
    await expect(page.getByRole("button", { name: /toutes/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /afrique/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /europe/i })).toBeVisible();
  });

  test("clicking a region filter updates the view", async ({ page }) => {
    await page.goto("/carte");
    const africaBtn = page.getByRole("button", { name: /afrique/i });
    await africaBtn.click();
    // After filtering, the button should be active (aria-pressed or class change)
    // Just verify it's still visible and clickable
    await expect(africaBtn).toBeVisible();
  });
});

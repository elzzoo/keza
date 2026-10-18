import { test, expect } from "@playwright/test";

test.describe("CI smoke", () => {
  test("FR home has the expected title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Cash ou Miles/i);
  });

  test("EN home has the expected title", async ({ page }) => {
    await page.goto("/en");
    await expect(page).toHaveTitle(/Cash vs Miles/i);
  });

  test("FR home exposes the search departure picker", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: /départ/i }).first()
    ).toBeVisible();
  });

  test("FR home exposes the price-alert entry point", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('a[href="/alertes"]').first()).toBeAttached();
  });

  test("EN home exposes the price-alert entry point", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator('a[href="/en/alertes"]').first()).toBeAttached();
  });
});

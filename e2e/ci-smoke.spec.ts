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

  test("switches a static legal page from FR to EN", async ({ page }) => {
    await page.goto("/mentions-legales");
    await expect(page.getByRole("heading", { name: "Mentions légales" })).toBeVisible();

    await page.getByRole("button", { name: /^en$/i }).click();

    await expect(page).toHaveURL(/\/en\/legal$/);
    await expect(page.getByRole("heading", { name: "Legal Notice" })).toBeVisible();
  });

  test("switches a static privacy page from EN to FR", async ({ page }) => {
    await page.goto("/en/privacy");
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();

    await page.getByRole("button", { name: /^fr$/i }).click();

    await expect(page).toHaveURL(/\/confidentialite$/);
    await expect(page.getByRole("heading", { name: "Politique de confidentialité" })).toBeVisible();
  });
});

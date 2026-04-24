import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("loads with correct title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/KEZA/i);
  });

  test("search form is visible", async ({ page }) => {
    await page.goto("/");
    // Search form inputs are buttons with airport placeholder text
    await expect(page.getByRole("button", { name: /Ex: Paris, CDG|departure|from/i }).first()).toBeVisible();
  });

  test("deals strip is visible", async ({ page }) => {
    await page.goto("/");
    // The live deals strip has a pulsing dot and "Deals du moment" label
    await expect(page.getByText(/deals du moment|live deals/i).first()).toBeVisible();
  });

  test("DealsStrip 'Voir tous' links to /deals", async ({ page }) => {
    await page.goto("/");
    const link = page.getByRole("link", { name: /voir tous|see all/i });
    await expect(link).toHaveAttribute("href", "/deals");
  });
});

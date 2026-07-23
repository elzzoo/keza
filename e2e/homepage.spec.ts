import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("loads with correct title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Xalifly/i);
  });

  test("search form is visible", async ({ page }) => {
    await page.goto("/");
    // AirportPicker's trigger button gets its accessible name from a visually-
    // hidden aria-labelledby label ("Départ"/"From"), not the visible
    // placeholder text — so the name must match the label, not the placeholder.
    await expect(
      page.getByRole("button", { name: /départ|from/i }).first()
    ).toBeVisible();
  });

  test("deals strip is visible", async ({ page }) => {
    await page.goto("/");
    // DealsStrip is lazy-loaded client-side — wait for hydration
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByText(/deals du moment|live deals/i).first()
    ).toBeVisible();
  });

  test("DealsStrip 'Voir tous' links to /deals", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const link = page.getByRole("link", { name: /voir tous|see all/i });
    await expect(link).toHaveAttribute("href", "/deals");
  });
});

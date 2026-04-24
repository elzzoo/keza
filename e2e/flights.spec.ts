import { test, expect } from "@playwright/test";

test.describe("/flights/[route] page", () => {
  test("loads with route heading", async ({ page }) => {
    await page.goto("/flights/DSS-CDG");
    // generateMetadata produces a deterministic title with city names
    await expect(page).toHaveTitle("Flights Dakar to Paris — Cash or Miles? | KEZA");
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

  test("page title contains origin and destination city names", async ({ page }) => {
    await page.goto("/flights/DSS-CDG");
    // generateMetadata builds "Flights Dakar to Paris — Cash or Miles? | KEZA"
    await expect(page).toHaveTitle("Flights Dakar to Paris — Cash or Miles? | KEZA");
  });

  test("page contains FAQPage JSON-LD structured data", async ({ page }) => {
    await page.goto("/flights/DSS-CDG");
    // FAQPage schema should be embedded as a JSON-LD script
    const faqScript = page.locator('script[type="application/ld+json"]').filter({
      hasText: "FAQPage",
    });
    await expect(faqScript).toHaveCount(1);
  });
});

import { test, expect } from "@playwright/test";

test.describe("/flights/[route] page", () => {
  test("loads with route heading", async ({ page }) => {
    await page.goto("/flights/DSS-CDG");
    // /flights/[route] is the French route — title uses French wording
    await expect(page).toHaveTitle("Vols Dakar → Paris CDG — Cash ou Miles ? | KEZA");
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
    // /flights/[route] = FR route; EN route is /en/flights/[route]
    await expect(page).toHaveTitle("Vols Dakar → Paris CDG — Cash ou Miles ? | KEZA");
  });

  test("page contains FAQPage JSON-LD structured data", async ({ page }) => {
    await page.goto("/flights/DSS-CDG");
    // FAQPage schema is embedded as a JSON-LD script — use evaluate to read script text content
    const hasFaq = await page.evaluate(() =>
      [...document.querySelectorAll('script[type="application/ld+json"]')].some(
        (s) => (s.textContent ?? "").includes("FAQPage")
      )
    );
    expect(hasFaq).toBe(true);
  });
});

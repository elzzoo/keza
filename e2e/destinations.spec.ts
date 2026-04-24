import { test, expect } from "@playwright/test";

test.describe("/destinations/[iata] page", () => {
  test("loads with correct title for CDG", async ({ page }) => {
    await page.goto("/destinations/cdg");
    await expect(page).toHaveTitle(/paris.*cash.*miles|cash.*miles.*paris/i);
  });

  test("shows destination city name", async ({ page }) => {
    await page.goto("/destinations/cdg");
    await expect(page.getByText("Paris").first()).toBeVisible();
  });

  test("shows cash vs miles recommendation badge", async ({ page }) => {
    await page.goto("/destinations/cdg");
    // Recommendation badge: MILES GAGNENT, CASH GAGNE, or SI TU AS LES MILES
    const badge = page.getByText(/miles gagnent|cash gagne|si tu as les miles|miles win|cash wins/i).first();
    await expect(badge).toBeVisible();
  });

  test("shows price sparkline SVG", async ({ page }) => {
    await page.goto("/destinations/cdg");
    // The price chart is an inline SVG with a polyline
    const svg = page.locator("svg").first();
    await expect(svg).toBeVisible();
  });

  test("shows search form pre-filled with DSS and CDG", async ({ page }) => {
    await page.goto("/destinations/cdg");
    await expect(page.getByText("DSS").first()).toBeVisible();
    await expect(page.getByText("CDG").first()).toBeVisible();
  });

  test("returns 404 for unknown IATA", async ({ page }) => {
    const res = await page.goto("/destinations/zzz");
    // Next.js notFound() renders the not-found page — check for 404 or KEZA 404 content
    await expect(page.getByText(/introuvable|not found/i).first()).toBeVisible();
  });
});

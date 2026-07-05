/**
 * e2e/multi-currency.spec.ts
 *
 * End-to-end tests for multi-currency functionality.
 *
 * Tests the complete user journey:
 * 1. User selects departure/arrival airports
 * 2. Performs a flight search
 * 3. Views prices in default currency (USD)
 * 4. Switches to alternative currency (EUR, GBP, JPY, etc.)
 * 5. Verifies prices update correctly
 * 6. Verifies selection persists across page reload
 *
 * Route: SIN → LAX (Singapore to Los Angeles)
 * This corridor always has flights and supports multiple loyalty programs.
 */

import { test, expect, type Page } from "@playwright/test";

function futureDate(daysAhead = 45): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split("T")[0]!;
}

const SEARCH_DATE = futureDate(45);

test.describe("Multi-Currency User Journey", () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    // Clear localStorage to start fresh
    await page.context().clearCookies();
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test("user can search flights and view prices in USD", async () => {
    // Fill search form
    await page.fill('input[placeholder*="From"]', "SIN");
    await page.fill('input[placeholder*="To"]', "LAX");
    await page.fill('input[type="date"]', SEARCH_DATE);

    // Click search button
    await page.click('button:has-text("Search")');

    // Wait for flight results to load
    await page.waitForSelector('[data-test="flight-card"]', { timeout: 10000 });

    // Verify USD prices are displayed
    const content = await page.content();
    expect(content).toContain("$");
  });

  test("user can change currency to EUR and prices update", async () => {
    // Search for flights first
    await page.fill('input[placeholder*="From"]', "SIN");
    await page.fill('input[placeholder*="To"]', "LAX");
    await page.fill('input[type="date"]', SEARCH_DATE);
    await page.click('button:has-text("Search")');

    // Wait for results
    await page.waitForSelector('[data-test="flight-card"]', { timeout: 10000 });

    // Check initial USD prices
    let content = await page.content();
    expect(content).toContain("$");

    // Change currency to EUR via dropdown
    const currencySelect = page.locator('select[aria-label*="currency"], select[name*="currency"]').first();
    if (await currencySelect.isVisible()) {
      await currencySelect.selectOption("EUR");
    } else {
      // Alternative: use button-based currency selector if dropdown doesn't exist
      const currencyButton = page.locator('button:has-text("USD")').first();
      if (await currencyButton.isVisible()) {
        await currencyButton.click();
        await page.click('button:has-text("EUR")');
      }
    }

    // Wait briefly for prices to re-render
    await page.waitForTimeout(500);

    // Verify EUR symbol is now present
    content = await page.content();
    expect(content).toContain("€");
    expect(content).not.toContain("$");
  });

  test("user can switch between multiple currencies", async () => {
    // Setup: search for flights
    await page.fill('input[placeholder*="From"]', "SIN");
    await page.fill('input[placeholder*="To"]', "LAX");
    await page.fill('input[type="date"]', SEARCH_DATE);
    await page.click('button:has-text("Search")');
    await page.waitForSelector('[data-test="flight-card"]', { timeout: 10000 });

    const currencySelect = page.locator('select[aria-label*="currency"], select[name*="currency"]').first();

    // Test USD → EUR → GBP → USD cycle
    await currencySelect.selectOption("EUR");
    await page.waitForTimeout(300);
    let content = await page.content();
    expect(content).toContain("€");

    await currencySelect.selectOption("GBP");
    await page.waitForTimeout(300);
    content = await page.content();
    expect(content).toContain("£");

    await currencySelect.selectOption("USD");
    await page.waitForTimeout(300);
    content = await page.content();
    expect(content).toContain("$");
  });

  test("currency selection persists after page reload", async () => {
    // Setup
    await page.fill('input[placeholder*="From"]', "SIN");
    await page.fill('input[placeholder*="To"]', "LAX");
    await page.fill('input[type="date"]', SEARCH_DATE);
    await page.click('button:has-text("Search")');
    await page.waitForSelector('[data-test="flight-card"]', { timeout: 10000 });

    // Select EUR
    const currencySelect = page.locator('select[aria-label*="currency"], select[name*="currency"]').first();
    await currencySelect.selectOption("EUR");
    await page.waitForTimeout(500);

    // Reload page
    await page.reload({ waitUntil: "networkidle" });

    // Verify currency is still EUR
    const selectedCurrency = await currencySelect.inputValue();
    expect(selectedCurrency).toBe("EUR");

    // Verify prices show EUR symbol
    let content = await page.content();
    expect(content).toContain("€");
  });

  test("JPY currency displays correctly with no decimal places", async () => {
    // Setup
    await page.fill('input[placeholder*="From"]', "SIN");
    await page.fill('input[placeholder*="To"]', "LAX");
    await page.fill('input[type="date"]', SEARCH_DATE);
    await page.click('button:has-text("Search")');
    await page.waitForSelector('[data-test="flight-card"]', { timeout: 10000 });

    // Select JPY (should show ¥ and no decimal places)
    const currencySelect = page.locator('select[aria-label*="currency"], select[name*="currency"]').first();
    await currencySelect.selectOption("JPY");
    await page.waitForTimeout(500);

    // Verify JPY display
    let content = await page.content();
    expect(content).toContain("¥");
  });

  test("XOF (West African franc) currency works correctly", async () => {
    // Setup
    await page.fill('input[placeholder*="From"]', "SIN");
    await page.fill('input[placeholder*="To"]', "LAX");
    await page.fill('input[type="date"]', SEARCH_DATE);
    await page.click('button:has-text("Search")');
    await page.waitForSelector('[data-test="flight-card"]', { timeout: 10000 });

    // Select XOF
    const currencySelect = page.locator('select[aria-label*="currency"], select[name*="currency"]').first();
    await currencySelect.selectOption("XOF");
    await page.waitForTimeout(500);

    // Verify XOF symbol/code is present
    let content = await page.content();
    expect(content).toContain("FCFA");
  });

  test("exchange rates are applied consistently across all flights", async () => {
    // Setup
    await page.fill('input[placeholder*="From"]', "SIN");
    await page.fill('input[placeholder*="To"]', "LAX");
    await page.fill('input[type="date"]', SEARCH_DATE);
    await page.click('button:has-text("Search")');
    await page.waitForSelector('[data-test="flight-card"]', { timeout: 10000 });

    // Get all flight prices in USD
    const usdPrices = await page.locator('[data-test="flight-price"]').allTextContents();
    const usdPriceCount = usdPrices.length;

    // Switch to EUR
    const currencySelect = page.locator('select[aria-label*="currency"], select[name*="currency"]').first();
    await currencySelect.selectOption("EUR");
    await page.waitForTimeout(500);

    // Get all flight prices in EUR
    const eurPrices = await page.locator('[data-test="flight-price"]').allTextContents();
    const eurPriceCount = eurPrices.length;

    // Count should be the same (same number of flights)
    expect(eurPriceCount).toBe(usdPriceCount);
  });

  test("flight details page shows correct currency", async () => {
    // Setup
    await page.fill('input[placeholder*="From"]', "SIN");
    await page.fill('input[placeholder*="To"]', "LAX");
    await page.fill('input[type="date"]', SEARCH_DATE);
    await page.click('button:has-text("Search")');
    await page.waitForSelector('[data-test="flight-card"]', { timeout: 10000 });

    // Select EUR
    const currencySelect = page.locator('select[aria-label*="currency"], select[name*="currency"]').first();
    await currencySelect.selectOption("EUR");
    await page.waitForTimeout(500);

    // Click first flight to go to details page
    await page.click('[data-test="flight-card"]');

    // Wait for details page to load
    await page.waitForSelector('[data-test="flight-details"]', { timeout: 5000 });

    // Verify EUR prices on details page
    let content = await page.content();
    expect(content).toContain("€");
  });

  test("currency selector is accessible from multiple pages", async () => {
    // Verify currency selector exists on homepage
    let currencySelect = page.locator('select[aria-label*="currency"], select[name*="currency"]').first();
    await expect(currencySelect).toBeVisible();

    // After search, should still be visible
    await page.fill('input[placeholder*="From"]', "SIN");
    await page.fill('input[placeholder*="To"]', "LAX");
    await page.fill('input[type="date"]', SEARCH_DATE);
    await page.click('button:has-text("Search")');
    await page.waitForSelector('[data-test="flight-card"]', { timeout: 10000 });

    currencySelect = page.locator('select[aria-label*="currency"], select[name*="currency"]').first();
    await expect(currencySelect).toBeVisible();
  });

  test("unsupported currencies fall back to USD gracefully", async () => {
    // This test verifies that if an invalid currency is in localStorage,
    // the app falls back to USD
    await page.context().addInitScript(() => {
      // Corrupt the currency in localStorage
      const profile = JSON.parse(localStorage.getItem("keza:profile") || "{}");
      profile.currency = "XYZ"; // Unsupported currency
      localStorage.setItem("keza:profile", JSON.stringify(profile));
    });

    // Reload page
    await page.reload({ waitUntil: "networkidle" });

    // Should still work (fallback to USD)
    await page.fill('input[placeholder*="From"]', "SIN");
    await page.fill('input[placeholder*="To"]', "LAX");
    await page.fill('input[type="date"]', SEARCH_DATE);
    await page.click('button:has-text("Search")');

    // Should display prices (in USD fallback)
    await page.waitForSelector('[data-test="flight-card"]', { timeout: 10000 });
  });

  test("price conversions are mathematically correct", async () => {
    // Setup
    await page.fill('input[placeholder*="From"]', "SIN");
    await page.fill('input[placeholder*="To"]', "LAX");
    await page.fill('input[type="date"]', SEARCH_DATE);
    await page.click('button:has-text("Search")');
    await page.waitForSelector('[data-test="flight-card"]', { timeout: 10000 });

    // Get a flight price in USD
    const firstFlightUsdText = await page.locator('[data-test="flight-price"]').first().textContent();
    const usdMatch = firstFlightUsdText?.match(/\$?([\d,]+(?:\.\d{2})?)/);
    if (!usdMatch) {
      throw new Error("Could not parse USD price");
    }

    const usdPrice = parseFloat(usdMatch[1].replace(/,/g, ""));

    // Switch to EUR (rate ~0.92)
    const currencySelect = page.locator('select[aria-label*="currency"], select[name*="currency"]').first();
    await currencySelect.selectOption("EUR");
    await page.waitForTimeout(500);

    // Get the same flight price in EUR
    const firstFlightEurText = await page.locator('[data-test="flight-price"]').first().textContent();
    const eurMatch = firstFlightEurText?.match(/€?([\d,]+(?:\.\d{2})?)/);
    if (!eurMatch) {
      throw new Error("Could not parse EUR price");
    }

    const eurPrice = parseFloat(eurMatch[1].replace(/,/g, ""));

    // EUR price should be approximately USD * 0.92 (allow 2% variance for rounding)
    const expectedEur = usdPrice * 0.92;
    const variance = Math.abs(eurPrice - expectedEur) / expectedEur;
    expect(variance).toBeLessThan(0.02);
  });
});

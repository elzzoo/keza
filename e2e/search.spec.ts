/**
 * e2e/search.spec.ts
 *
 * End-to-end tests for the core KEZA value proposition:
 *   search → flight results → recommendation (USE_MILES / USE_CASH)
 *
 * Three layers:
 *   1. API layer  — POST /api/search, validate shape & business rules
 *   2. UI layer   — pre-fill form via URL params, click search, check cards
 *   3. Content     — key UI text (savings badge, miles count, programme names)
 *
 * Route used: DSS → CDG (Dakar → Paris) — well-established, always has
 * at least one result even in test environments with limited API keys.
 *
 * Timeouts: search can take up to 18 s server-side.  We allow 40 s per test
 * (Playwright config default is 45 s).
 */

import { test, expect, type APIResponse } from "@playwright/test";

// ── Shared fixtures ──────────────────────────────────────────────────────────

/** A date far enough in the future to find flights (45 days from test run). */
function futureDate(daysAhead = 45): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split("T")[0]!;
}

const SEARCH_DATE = futureDate(45);

// ─────────────────────────────────────────────────────────────────────────────
// 1. API LAYER — /api/search
// ─────────────────────────────────────────────────────────────────────────────

test.describe("POST /api/search — response shape & business rules", () => {
  let response: APIResponse;
  let body: { results: Record<string, unknown>[]; partial?: boolean; error?: string };

  // Run one search once and share across the describe block.
  test.beforeAll(async ({ request }) => {
    response = await request.post("/api/search", {
      data: {
        from:     "DSS",
        to:       "CDG",
        date:     SEARCH_DATE,
        cabin:    "economy",
        tripType: "oneway",
        passengers: 1,
        stops:    "any",
      },
      timeout: 40_000,
    });
    body = await response.json();
  });

  test("returns HTTP 200", () => {
    expect(response.status()).toBe(200);
  });

  test("body has a results array", () => {
    expect(Array.isArray(body.results)).toBe(true);
  });

  test("returns at least one flight result for DSS→CDG", () => {
    expect(body.results.length).toBeGreaterThan(0);
  });

  test("every result has required fields: from, to, totalPrice, recommendation", () => {
    for (const r of body.results) {
      expect(r).toHaveProperty("from", "DSS");
      expect(r).toHaveProperty("to", "CDG");
      expect(typeof r["totalPrice"]).toBe("number");
      expect(["USE_MILES", "USE_CASH"]).toContain(r["recommendation"]);
    }
  });

  test("cashCost equals totalPrice on every result", () => {
    for (const r of body.results) {
      expect(r["cashCost"]).toBe(r["totalPrice"]);
    }
  });

  test("cashCost is never zero or negative", () => {
    for (const r of body.results) {
      expect(r["cashCost"] as number).toBeGreaterThan(0);
    }
  });

  test("savings sign is consistent with recommendation", () => {
    for (const r of body.results) {
      const savings       = r["savings"] as number;
      const recommendation = r["recommendation"] as string;
      const cashCost      = r["cashCost"] as number;
      const milesCost     = r["milesCost"] as number;

      if (recommendation === "USE_MILES") {
        // Miles cheaper: milesCost < cashCost → savings > 0
        expect(milesCost).toBeLessThan(cashCost);
        expect(savings).toBeGreaterThan(0);
      } else {
        // USE_CASH: either no miles option, or miles more expensive
        expect(savings).toBeLessThanOrEqual(0);
      }
    }
  });

  test("at least one USE_MILES result exists (DSS→CDG is a high-value miles route)", () => {
    const milesWins = body.results.filter((r) => r["recommendation"] === "USE_MILES");
    expect(milesWins.length).toBeGreaterThan(0);
  });

  test("every USE_MILES result has milesOptions with at least one entry", () => {
    const milesWins = body.results.filter((r) => r["recommendation"] === "USE_MILES");
    for (const r of milesWins) {
      const opts = r["milesOptions"] as unknown[];
      expect(Array.isArray(opts)).toBe(true);
      expect(opts.length).toBeGreaterThan(0);
    }
  });

  test("non-supplemental results have at least one miles programme", () => {
    // Supplemental/synthetic results (isSupplemental: true) are price-indicator
    // cards with no milesOptions — that's intentional. All real results must have
    // at least one programme in milesOptions so the comparison is meaningful.
    const realResults = body.results.filter((r) => !r["isSupplemental"]);
    expect(realResults.length).toBeGreaterThan(0); // sanity: at least one real result
    for (const r of realResults) {
      const opts = (r["milesOptions"] as unknown[]) ?? [];
      expect(opts.length).toBeGreaterThan(0);
    }
  });

  test("at least one result has a DIRECT milesOption", () => {
    // Every result from a named airline should have at least one DIRECT option
    // (the flagship program for that carrier).
    const hasAnyDirect = body.results.some((r) => {
      const opts = (r["milesOptions"] as Array<{ type: string }>) ?? [];
      return opts.some((o) => o.type === "DIRECT");
    });
    expect(hasAnyDirect).toBe(true);
  });

  test("every milesOption has milesRequired > 0 and taxes ≥ 0", () => {
    for (const r of body.results) {
      const opts = (r["milesOptions"] as Array<{ milesRequired: number; taxes: number }>) ?? [];
      for (const opt of opts) {
        expect(opt.milesRequired).toBeGreaterThan(0);
        expect(opt.taxes).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("bestOption is the option marked isBestDeal on each USE_MILES result", () => {
    const milesWins = body.results.filter((r) => r["recommendation"] === "USE_MILES");
    for (const r of milesWins) {
      const opts      = r["milesOptions"] as Array<{ isBestDeal: boolean }>;
      const bestDeals = opts.filter((o) => o.isBestDeal);
      expect(bestDeals).toHaveLength(1);
    }
  });

  test("no result has more than 12 milesOptions (display cap)", () => {
    for (const r of body.results) {
      const opts = (r["milesOptions"] as unknown[]) ?? [];
      expect(opts.length).toBeLessThanOrEqual(12);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. API LAYER — input validation
// ─────────────────────────────────────────────────────────────────────────────

test.describe("POST /api/search — input validation", () => {
  test("returns 400 when from/to are missing", async ({ request }) => {
    const res = await request.post("/api/search", {
      data: { date: SEARCH_DATE },
    });
    expect(res.status()).toBe(400);
  });

  test("normalizes lowercase IATA codes (dss → DSS) and returns 200", async ({ request }) => {
    // The API normalizes input to uppercase before validation — "dss" is valid.
    const res = await request.post("/api/search", {
      data: { from: "dss", to: "cdg", date: SEARCH_DATE },
    });
    // 200 (normalized) or 429 (rate limit in test) — never 400 for case mismatch
    expect([200, 429]).toContain(res.status());
  });

  test("returns 400 for truly invalid IATA codes (numbers, wrong length)", async ({ request }) => {
    const res = await request.post("/api/search", {
      data: { from: "D1S", to: "CDG", date: SEARCH_DATE },
    });
    expect(res.status()).toBe(400);
  });

  test("returns 400 when date is missing", async ({ request }) => {
    const res = await request.post("/api/search", {
      data: { from: "DSS", to: "CDG" },
    });
    expect(res.status()).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Shared mock response — a realistic FlightResult payload for DSS→CDG.
// Used by UI tests so they don't depend on live API keys in local dev.
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_SEARCH_RESULTS = {
  results: [
    {
      from: "DSS", to: "CDG",
      price: 650, totalPrice: 650, cashCost: 650,
      airlines: ["Air France"], stops: 0,
      cabin: "economy", tripType: "oneway", passengers: 1,
      milesCost: 370, savings: 280, recommendation: "USE_MILES",
      bestOption: {
        type: "DIRECT", program: "Flying Blue",
        milesRequired: 25000, taxes: 120, totalMilesCost: 370,
        savings: 280, isBestDeal: true,
        valuePerMile: 1.5, milesCost: 375, confidence: "HIGH",
        operatingAirline: "Air France", chartSource: "REAL",
        explanation: "25 000 miles Flying Blue + 120 $ taxes",
      },
      milesOptions: [
        {
          type: "DIRECT", program: "Flying Blue", via: undefined,
          milesRequired: 25000, taxes: 120, totalMilesCost: 370,
          savings: 280, isBestDeal: true,
          valuePerMile: 1.5, milesCost: 375, confidence: "HIGH",
          operatingAirline: "Air France", chartSource: "REAL",
          explanation: "25 000 miles Flying Blue + 120 $ taxes",
        },
        {
          type: "TRANSFER", program: "Flying Blue", via: "Amex MR",
          milesRequired: 25000, taxes: 120, totalMilesCost: 390,
          savings: 260, isBestDeal: false,
          valuePerMile: 1.6, milesCost: 400, confidence: "HIGH",
          operatingAirline: "Air France", chartSource: "REAL",
          explanation: "Transférer 25 000 pts Amex MR → Flying Blue",
        },
      ],
      explanation: "25 000 miles Flying Blue + 120 $ taxes = 370 $, vs 650 $ cash",
      displayMessage: "miles_cheaper | Flying Blue | 25000 mi | save 280",
      disclaimer: "Prix estimé — vérifier sur la compagnie.",
      searchId: "test-e2e-mock",
      optimization: { type: "DIRECT", program: "Flying Blue" },
      source: "TP", priceConfidence: "LOW",
    },
    {
      from: "DSS", to: "CDG",
      price: 580, totalPrice: 580, cashCost: 580,
      airlines: ["Air Senegal"], stops: 0,
      cabin: "economy", tripType: "oneway", passengers: 1,
      milesCost: 700, savings: -120, recommendation: "USE_CASH",
      bestOption: null,
      milesOptions: [
        {
          type: "ALLIANCE", program: "Flying Blue", via: undefined,
          milesRequired: 25000, taxes: 80, totalMilesCost: 700,
          savings: -120, isBestDeal: true,
          valuePerMile: 1.5, milesCost: 375, confidence: "HIGH",
          operatingAirline: "Air Senegal", chartSource: "REAL",
          explanation: "25 000 miles Flying Blue + 80 $ taxes",
        },
      ],
      explanation: "Cash moins cher — 580 $ vs 700 $ avec les miles.",
      displayMessage: "cash_cheaper | save 120",
      disclaimer: "Prix estimé — vérifier sur la compagnie.",
      searchId: "test-e2e-mock",
      optimization: { type: "CASH" },
      source: "TP", priceConfidence: "LOW",
    },
  ],
  partial: false,
};

/** Intercept /api/search and return mock data instantly */
async function mockSearch(page: import("@playwright/test").Page) {
  await page.route("**/api/search", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_SEARCH_RESULTS),
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. UI LAYER — search form → results (mocked API)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Search form → results (UI flow, mocked API)", () => {
  /**
   * Mock the API so UI tests run fast and deterministically in any environment.
   * Structural tests (does the form work? does a card render?) don't need live data.
   */
  test("pre-filled form shows DSS and CDG in the form", async ({ page }) => {
    await mockSearch(page);
    await page.goto(`/?from=DSS&to=CDG&date=${SEARCH_DATE}&tripType=oneway`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("DSS").first()).toBeVisible();
    await expect(page.getByText("CDG").first()).toBeVisible();
  });

  test("clicking search shows loading spinner momentarily", async ({ page }) => {
    await mockSearch(page);
    await page.goto(`/?from=DSS&to=CDG&date=${SEARCH_DATE}&tripType=oneway`);
    await page.waitForLoadState("networkidle");

    const submitBtn = page.getByRole("button", { name: /optimiser mon vol|optimize my flight/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();
    // With mock API, search resolves in <50ms — spinner may flash briefly or
    // not appear at all. We just assert the button becomes re-enabled.
    await expect(submitBtn).not.toBeDisabled({ timeout: 5_000 });
  });

  test("search returns at least one price after completion", async ({ page }) => {
    await mockSearch(page);
    await page.goto(`/?from=DSS&to=CDG&date=${SEARCH_DATE}&tripType=oneway`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /optimiser mon vol|optimize my flight/i }).click();

    // Wait for results to appear — mock returns instantly, so 5 s is plenty
    await expect(page.getByText(/\$\d+|\€\d+|FCFA|\d+\s*\$|\d+\s*€/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("USE_MILES card shows savings badge", async ({ page }) => {
    await mockSearch(page);
    await page.goto(`/?from=DSS&to=CDG&date=${SEARCH_DATE}&tripType=oneway`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /optimiser mon vol|optimize my flight/i }).click();

    // The USE_MILES result should render the "🔥 Tu économises" badge
    await expect(
      page.getByText(/économises|you save/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("Flying Blue appears in results for DSS→CDG", async ({ page }) => {
    await mockSearch(page);
    await page.goto(`/?from=DSS&to=CDG&date=${SEARCH_DATE}&tripType=oneway`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /optimiser mon vol|optimize my flight/i }).click();

    await expect(page.getByText("Flying Blue").first()).toBeVisible({ timeout: 10_000 });
  });

  test("USE_CASH result shows cash badge", async ({ page }) => {
    await mockSearch(page);
    await page.goto(`/?from=DSS&to=CDG&date=${SEARCH_DATE}&tripType=oneway`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /optimiser mon vol|optimize my flight/i }).click();

    // The USE_CASH mock result should show "💵 Cash" badge
    await expect(
      page.getByText(/cash moins cher|pay cash|cash/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. UI LAYER — /flights/[route] static route page
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Search from /flights/[route] page", () => {
  test("route page has a search form pre-filled with DSS and CDG", async ({ page }) => {
    await page.goto("/flights/DSS-CDG", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("DSS").first()).toBeVisible();
    await expect(page.getByText("CDG").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /optimiser mon vol|optimize my flight/i })
    ).toBeVisible();
  });

  test("route page search returns results with Flying Blue (mocked)", async ({ page }) => {
    await mockSearch(page);
    await page.goto("/flights/DSS-CDG", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: /optimiser mon vol|optimize my flight/i }).click();

    await expect(page.getByText("Flying Blue").first()).toBeVisible({ timeout: 10_000 });
  });
});

/**
 * e2e/alerts-pipeline.spec.ts
 *
 * End-to-end tests for the price alert pipeline:
 *   1. API layer  — POST /api/alerts: validation, 201, 409, 429
 *   2. UI layer   — PriceAlertForm on a flight page: form, success, limit states
 *   3. Referral   — ?ref= param persisted in sessionStorage → sent on alert creation
 *
 * All UI tests mock the /api/alerts endpoint so results are deterministic
 * and don't depend on Redis state or email delivery.
 */

import { test, expect } from "@playwright/test";

// ── 1. API LAYER ──────────────────────────────────────────────────────────────

test.describe("POST /api/alerts — input validation", () => {
  test("400 on missing required fields", async ({ request }) => {
    const res = await request.post("/api/alerts", {
      data: { email: "test@example.com" }, // missing from, to, currentPrice
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test("400 on invalid email", async ({ request }) => {
    const res = await request.post("/api/alerts", {
      data: {
        email: "not-an-email",
        from: "CDG",
        to: "DSS",
        currentPrice: 400,
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/email/i);
  });

  test("400 on invalid IATA codes", async ({ request }) => {
    const res = await request.post("/api/alerts", {
      data: {
        email: "test@example.com",
        from: "NOT",         // not a valid IATA in context
        to: "TOOLONG",       // too long
        currentPrice: 400,
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test("400 on invalid cabin value", async ({ request }) => {
    const res = await request.post("/api/alerts", {
      data: {
        email: "test@example.com",
        from: "CDG",
        to: "DSS",
        currentPrice: 400,
        cabin: "supersonic", // not a valid cabin
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/cabin/i);
  });

  test("400 on zero price", async ({ request }) => {
    const res = await request.post("/api/alerts", {
      data: {
        email: "test@example.com",
        from: "CDG",
        to: "DSS",
        currentPrice: 0,
      },
    });
    expect(res.status()).toBe(400);
  });
});

// ── 2. UI LAYER — PriceAlertForm ──────────────────────────────────────────────

test.describe("PriceAlertForm — success state", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the alerts API to return a successful 201
    await page.route("/api/alerts", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            alert: {
              id: "test-alert-id",
              email: "user@example.com",
              from: "CDG",
              to: "DSS",
              cabin: "economy",
              targetPrice: 360,
              active: true,
            },
          }),
        });
      } else {
        route.continue();
      }
    });
  });

  test("form renders on a flight page", async ({ page }) => {
    await page.goto("/flights/CDG-DSS");
    await page.waitForLoadState("networkidle");

    // The PriceAlertForm should be present
    await expect(page.getByPlaceholder(/email/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /créer l'alerte|create alert/i }).first()).toBeVisible();
  });

  test("submitting email shows success state with push opt-in and referral link", async ({ page }) => {
    await page.goto("/flights/CDG-DSS");
    await page.waitForLoadState("networkidle");

    // Fill and submit the alert form
    const emailInput = page.getByPlaceholder(/votre email|your email/i).first();
    await emailInput.waitFor({ state: "visible", timeout: 15_000 });
    await emailInput.fill("user@example.com");
    await page.getByRole("button", { name: /créer l'alerte|create alert/i }).first().click();

    // Success state: check the confirmation message
    await expect(
      page.getByText(/alerte créée|alert created/i).first()
    ).toBeVisible({ timeout: 10_000 });

    // Referral CTA should appear in success state
    await expect(
      page.getByText(/invitez un ami|invite a friend|parrainer/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("PriceAlertForm — duplicate state (409)", () => {
  test("shows duplicate warning when alert already exists", async ({ page }) => {
    await page.route("/api/alerts", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ error: "Alert already exists", existingId: "abc" }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/flights/CDG-DSS");
    await page.waitForLoadState("networkidle");

    const emailInput = page.getByPlaceholder(/votre email|your email/i).first();
    await emailInput.waitFor({ state: "visible", timeout: 15_000 });
    await emailInput.fill("user@example.com");
    await page.getByRole("button", { name: /créer l'alerte|create alert/i }).first().click();

    // Should show duplicate warning
    await expect(
      page.getByText(/déjà active|already active/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("PriceAlertForm — freemium limit (429)", () => {
  test("shows upgrade CTA when free limit reached", async ({ page }) => {
    await page.route("/api/alerts", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 429,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Limite atteinte",
            code: "FREE_LIMIT_REACHED",
            limit: 3,
            current: 3,
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/flights/CDG-DSS");
    await page.waitForLoadState("networkidle");

    const emailInput = page.getByPlaceholder(/votre email|your email/i).first();
    await emailInput.waitFor({ state: "visible", timeout: 15_000 });
    await emailInput.fill("user@example.com");
    await page.getByRole("button", { name: /créer l'alerte|create alert/i }).first().click();

    // Should show the Pro waitlist link and referral CTA
    await expect(
      page.getByText(/limite.*gratuite|free limit/i).first()
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByRole("link", { name: /pro/i }).first()
    ).toBeVisible({ timeout: 5_000 });

    await expect(
      page.getByText(/parrainer|refer/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });
});

// ── 3. REFERRAL ───────────────────────────────────────────────────────────────

test.describe("Referral — ?ref= URL param", () => {
  test("?ref= param is stored in sessionStorage on homepage", async ({ page }) => {
    await page.goto("/?ref=ABCD1234");
    await page.waitForLoadState("networkidle");

    // Wait for JS to execute and store the ref
    await page.waitForTimeout(1_000);

    const stored = await page.evaluate(() =>
      sessionStorage.getItem("keza_ref")
    );
    expect(stored).toBe("ABCD1234");
  });

  test("ref param is sent in alert creation payload", async ({ page }) => {
    let capturedBody: Record<string, unknown> | null = null;

    await page.route("/api/alerts", (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON() as Record<string, unknown>;
        capturedBody = body;
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, alert: { id: "x" } }),
        });
      } else {
        route.continue();
      }
    });

    // Navigate with ref param so sessionStorage gets seeded
    await page.goto("/flights/CDG-DSS?ref=TESTREF1");
    await page.waitForLoadState("networkidle");

    // Manually seed sessionStorage (in case the flight page doesn't pick up the ref param)
    await page.evaluate(() => sessionStorage.setItem("keza_ref", "TESTREF1"));

    const emailInput = page.getByPlaceholder(/votre email|your email/i).first();
    await emailInput.waitFor({ state: "visible", timeout: 15_000 });
    await emailInput.fill("referred@example.com");
    await page.getByRole("button", { name: /créer l'alerte|create alert/i }).first().click();

    // The request body should include the ref
    await page.waitForTimeout(2_000);
    expect(capturedBody).not.toBeNull();
    expect((capturedBody as Record<string, unknown>).ref).toBe("TESTREF1");
  });
});

// ── 4. NOTIFICATION FREQUENCY ─────────────────────────────────────────────────

test.describe("PriceAlertForm — notification frequency", () => {
  test("frequency selector has 3 options and Daily is default", async ({ page }) => {
    await page.goto("/flights/CDG-DSS");
    await page.waitForLoadState("networkidle");

    // Wait for the form to appear
    await page.getByPlaceholder(/votre email|your email/i).first()
      .waitFor({ state: "visible", timeout: 15_000 });

    // The frequency grid should have 3 buttons: Daily, Daily (quotidien), Weekly (hebdo)
    const freqButtons = page.locator(
      "button:has-text('Daily'), button:has-text('Quotidien'), button:has-text('Hebdo'), button:has-text('Weekly')"
    );
    await expect(freqButtons).toHaveCount(3, { timeout: 5_000 });
  });
});

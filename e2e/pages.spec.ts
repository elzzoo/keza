import { test, expect } from "@playwright/test";

// ── /entreprises ─────────────────────────────────────────────────────────────

test.describe("/entreprises page", () => {
  test("loads and shows hero heading", async ({ page }) => {
    await page.goto("/entreprises");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("shows 'KEZA for Business' branding", async ({ page }) => {
    await page.goto("/entreprises");
    await expect(page.getByText(/keza.*business|business.*keza/i).first()).toBeVisible();
  });

  test("shows contact form with email input", async ({ page }) => {
    await page.goto("/entreprises");
    const emailInput = page.getByRole("textbox").first();
    await expect(emailInput).toBeVisible();
  });
});

// ── /mentions-legales ─────────────────────────────────────────────────────────

test.describe("/mentions-legales page", () => {
  test("loads with correct title", async ({ page }) => {
    await page.goto("/mentions-legales");
    await expect(page).toHaveTitle(/mentions.*légales|légales.*keza/i);
  });

  test("has back-to-home link", async ({ page }) => {
    await page.goto("/mentions-legales");
    await expect(page.getByRole("link", { name: /retour/i })).toBeVisible();
  });
});

// ── /confidentialite ─────────────────────────────────────────────────────────

test.describe("/confidentialite page", () => {
  test("loads with correct title", async ({ page }) => {
    await page.goto("/confidentialite");
    await expect(page).toHaveTitle(/confidentialité|confidentialite/i);
  });

  test("has back-to-home link", async ({ page }) => {
    await page.goto("/confidentialite");
    await expect(page.getByRole("link", { name: /retour/i })).toBeVisible();
  });
});

// ── Security headers ──────────────────────────────────────────────────────────

test.describe("Security headers", () => {
  test("homepage sends X-Frame-Options: DENY", async ({ request }) => {
    const res = await request.get("/");
    const header = res.headers()["x-frame-options"];
    expect(header?.toLowerCase()).toBe("deny");
  });

  test("homepage sends X-Content-Type-Options: nosniff", async ({ request }) => {
    const res = await request.get("/");
    const header = res.headers()["x-content-type-options"];
    expect(header?.toLowerCase()).toBe("nosniff");
  });

  test("homepage sends Referrer-Policy", async ({ request }) => {
    const res = await request.get("/");
    const header = res.headers()["referrer-policy"];
    expect(header).toBeTruthy();
    expect(header?.toLowerCase()).toContain("strict-origin");
  });

  test("homepage sends Permissions-Policy", async ({ request }) => {
    const res = await request.get("/");
    const header = res.headers()["permissions-policy"];
    expect(header).toBeTruthy();
    expect(header).toContain("camera=()");
  });
});

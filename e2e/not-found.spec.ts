import { test, expect } from "@playwright/test";

test.describe("404 not-found page", () => {
  test("shows branded 404 page for unknown route", async ({ page }) => {
    await page.goto("/this-page-does-not-exist-xyz");
    await expect(page.getByRole("heading", { name: /introuvable/i })).toBeVisible();
  });

  test("shows KEZA branding on 404", async ({ page }) => {
    await page.goto("/another-unknown-route-abc");
    // Logo text should be visible
    await expect(page.getByText("KE").first()).toBeVisible();
  });

  test("404 page has back-to-home link", async ({ page }) => {
    await page.goto("/this-does-not-exist");
    const homeLink = page.getByRole("link", { name: /retour.*accueil/i });
    await expect(homeLink).toBeVisible();
    await expect(homeLink).toHaveAttribute("href", "/");
  });

  test("404 page has deals shortcut link", async ({ page }) => {
    await page.goto("/this-does-not-exist");
    const dealsLink = page.getByRole("link", { name: /deals/i });
    await expect(dealsLink).toBeVisible();
  });

  test("404 page title is set", async ({ page }) => {
    await page.goto("/this-does-not-exist");
    await expect(page).toHaveTitle(/introuvable|not found/i);
  });
});

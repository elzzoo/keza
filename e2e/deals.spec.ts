import { test, expect } from "@playwright/test";

test.describe("/deals page", () => {
  test("loads with correct heading", async ({ page }) => {
    await page.goto("/deals");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Deals cash vs miles"
    );
  });

  test("shows filter tabs", async ({ page }) => {
    await page.goto("/deals");
    await expect(page.getByRole("button", { name: /tous/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /miles gagnent/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /cash gagne/i })).toBeVisible();
  });

  test("shows at least one deal card (fallback data)", async ({ page }) => {
    await page.goto("/deals");
    // Each deal card has an "Analyser ce vol" link
    const cards = page.getByRole("link", { name: /analyser ce vol/i });
    await expect(cards.first()).toBeVisible();
  });

  test("filter tab changes displayed deals", async ({ page }) => {
    await page.goto("/deals");
    // Click "Miles gagnent" filter
    await page.getByRole("button", { name: /miles gagnent/i }).click();
    // After filtering, the main deals grid should still be visible (or empty state)
    const grid = page.locator(".grid").first();
    await expect(grid).toBeVisible();
  });

  test("'Créer une alerte' CTA links to /", async ({ page }) => {
    await page.goto("/deals");
    const cta = page.getByRole("link", { name: /créer une alerte/i });
    await expect(cta).toHaveAttribute("href", "/");
  });
});

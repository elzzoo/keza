import { test, expect } from "@playwright/test";

// The onboarding wizard (components/OnboardingWizard.tsx) shows itself to
// new users 1.2s after the homepage settles, and only while
// profile.hasOnboarded is false and no programs are selected. It used to
// have no dialog semantics and no Escape handling — a real accessibility
// regression found during an audit of this session. These tests guard both.

test.describe("Onboarding wizard", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("keza_profile");
    });
  });

  test("appears for a new user and exposes dialog semantics", async ({ page }) => {
    await page.goto("/");
    const dialog = page.getByRole("dialog", { name: /programmes miles/i });
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  test("Escape dismisses it and it does not reappear on reload", async ({ page }) => {
    await page.goto("/");
    const dialog = page.getByRole("dialog", { name: /programmes miles/i });
    await expect(dialog).toBeVisible({ timeout: 3000 });

    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1500); // longer than the wizard's own 1.2s show-delay
    await expect(page.getByRole("dialog", { name: /programmes miles/i })).not.toBeVisible();
  });

  test("does not appear for a user who already onboarded", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "keza_profile",
        JSON.stringify({
          programs: [],
          currency: "USD",
          lang: "fr",
          cabin: "economy",
          recentSearches: [],
          favoriteRoutes: [],
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          balances: {},
          bankPoints: {},
          hasOnboarded: true,
        })
      );
    });
    await page.goto("/");
    await page.waitForTimeout(1500);
    await expect(page.getByRole("dialog", { name: /programmes miles/i })).not.toBeVisible();
  });
});

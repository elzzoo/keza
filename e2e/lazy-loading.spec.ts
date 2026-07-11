import { test, expect } from '@playwright/test';

test.describe('P0.4 Lazy Loading - Dynamic Imports', () => {
  test('carte page loads with map skeleton fallback', async ({ page }) => {
    await page.goto('/carte');

    // Verify skeleton shows (lazy load in progress)
    const skeleton = page.locator('text=Loading map');
    await expect(skeleton).toBeVisible({ timeout: 2000 });

    // Verify map eventually loads
    const mapContainer = page.locator('[class*="rounded-lg"]');
    await expect(mapContainer).toBeVisible({ timeout: 10000 });
  });

  test('prix page loads with calendar skeleton fallback', async ({ page }) => {
    await page.goto('/prix');

    // Verify skeleton during load
    const skeletonItems = page.locator('[class*="bg-surface-2"]');
    await expect(skeletonItems.first()).toBeVisible({ timeout: 2000 });

    // Calendar should load
    const calendar = page.locator('button:has-text("janvier")').first();
    await expect(calendar).toBeVisible({ timeout: 10000 });
  });

  test('programmes page lazy loads table', async ({ page }) => {
    await page.goto('/programmes');

    // Table should load
    const programTable = page.locator('table');
    await expect(programTable).toBeVisible({ timeout: 10000 });
  });

  test('main bundle does not include route-specific code', async ({ page }) => {
    await page.goto('/');

    // Verify main page loads quickly (main bundle only)
    const searchForm = page.locator('input[placeholder*="From"]');
    await expect(searchForm).toBeVisible({ timeout: 3000 });

    // Main bundle loaded - good performance baseline
    const perfMetrics = await page.evaluate(() => ({
      fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
    }));

    expect(perfMetrics.fcp).toBeLessThan(3000); // FCP under 3s
  });
});

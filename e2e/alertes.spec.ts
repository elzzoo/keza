import { test, expect } from "@playwright/test";

test.describe("/alertes page", () => {
  test("loads with correct heading", async ({ page }) => {
    await page.goto("/alertes");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /alertes prix/i
    );
  });

  test("email form is visible", async ({ page }) => {
    await page.goto("/alertes");
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /voir mes alertes|view my alerts/i })).toBeVisible();
  });

  test("submitting with mocked API shows empty state", async ({ page }) => {
    // Mock the alerts API to return an empty array
    await page.route("/api/alerts*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ alerts: [] }),
      });
    });

    await page.goto("/alertes");
    await page.getByPlaceholder(/email/i).fill("test@example.com");
    await page.getByRole("button", { name: /voir mes alertes|view my alerts/i }).click();

    // Should show empty state message
    await expect(page.getByText(/aucune alerte active|no active alerts/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("localStorage email is pre-filled on mount", async ({ page }) => {
    // Pre-seed localStorage before the page loads
    await page.goto("/alertes");
    await page.evaluate(() => {
      localStorage.setItem("keza:alertes:email", "saved@example.com");
    });

    // Mock the API call that will be triggered automatically
    await page.route("/api/alerts*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ alerts: [] }),
      });
    });

    // Reload page — should auto-fill email and trigger fetch
    await page.reload();
    const input = page.getByPlaceholder(/email/i);
    await expect(input).toHaveValue("saved@example.com");
  });
});

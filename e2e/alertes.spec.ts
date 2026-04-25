import { test, expect } from "@playwright/test";

test.describe("/alertes page", () => {
  test("loads with correct heading", async ({ page }) => {
    await page.goto("/alertes");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /alertes prix/i
    );
  });

  test("email form is visible with correct button", async ({ page }) => {
    await page.goto("/alertes");
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    // Button sends a magic link — text is "Recevoir le lien" (FR) or "Send link" (EN)
    await expect(
      page.getByRole("button", { name: /recevoir le lien|send link/i })
    ).toBeVisible();
  });

  test("submitting email shows success notice", async ({ page }) => {
    // Mock the manage-link API to avoid actually sending emails
    await page.route("/api/alerts/manage-link*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto("/alertes");
    await page.getByPlaceholder(/email/i).fill("test@example.com");
    await page.getByRole("button", { name: /recevoir le lien|send link/i }).click();

    // Should show a success notice after submission
    await expect(
      page.getByText(/lien de gestion vient d'être envoyé|management link has been sent/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test("localStorage email+token pre-fills and fetches alerts", async ({ page }) => {
    // Mock the alerts API to return an empty list
    await page.route("/api/alerts*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ alerts: [] }),
      });
    });

    await page.goto("/alertes");
    // Seed both email AND token — page only auto-fetches when both are present
    await page.evaluate(() => {
      localStorage.setItem("keza:alertes:email", "saved@example.com");
      localStorage.setItem("keza:alertes:token", "fake-token-for-test");
    });

    await page.reload();

    // Email input should be pre-filled
    await expect(page.getByPlaceholder(/email/i)).toHaveValue("saved@example.com");
  });

  test("push alert button is rendered on the page", async ({ page }) => {
    await page.goto("/alertes");
    const pushUI = page.getByText(
      /activer les alertes push|enable push alerts|alertes push activées|push alerts enabled|bloquées|blocked/i
    );
    await expect(pushUI).toBeVisible({ timeout: 5000 });
  });
});

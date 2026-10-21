import { test, expect } from "@playwright/test";

test.describe("CI smoke", () => {
  test("FR home has the expected title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Cash ou Miles/i);
  });

  test("EN home has the expected title", async ({ page }) => {
    await page.goto("/en");
    await expect(page).toHaveTitle(/Cash vs Miles/i);
  });

  test("FR home exposes the search departure picker", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: /départ/i }).first()
    ).toBeVisible();
  });

  test.describe("mocked search", () => {
    test.use({ serviceWorkers: "block" });

    test("FR search submits the selected route and shows an empty result", async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem("keza:visited", "true");
        localStorage.setItem("keza_profile", JSON.stringify({ hasOnboarded: true }));
      });
      const date = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      let intercepted = false;
      await page.route("**/api/search/stream", async (route) => {
        intercepted = true;
        const event = `data: ${JSON.stringify({ type: "final", results: [], partial: false, forexRate: 1 })}\n\n`;
        await route.fulfill({ status: 200, contentType: "text/event-stream", body: event });
      });

      await page.goto(`/?from=CDG&to=JFK&date=${date}&tripType=oneway`);
      const submit = page.getByRole("button", { name: /optimiser mon vol/i });
      await expect(submit).toBeEnabled();
      await submit.evaluate((element) => {
        window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 100 });
      });

      const searchRequest = page.waitForRequest((request) =>
        request.url().endsWith("/api/search/stream") && request.method() === "POST"
      );
      await submit.click();
      expect((await searchRequest).postDataJSON()).toMatchObject({
        from: "CDG",
        to: "JFK",
        date,
        tripType: "oneway",
        cabin: "economy",
      });
      await expect(
        page.getByText("Données indisponibles sur cette route actuellement")
      ).toBeVisible({ timeout: 10_000 });
      expect(intercepted).toBe(true);
    });
  });

  test("FR home exposes the price-alert entry point", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('a[href="/alertes"]').first()).toBeAttached();
  });

  test("EN home exposes the price-alert entry point", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator('a[href="/en/alertes"]').first()).toBeAttached();
  });

  test.describe("mocked alert management", () => {
    test.use({ serviceWorkers: "block" });

    test("FR alert page requests a management link for a normalized email", async ({ page }) => {
      let submittedEmail: string | undefined;
      await page.route("**/api/alerts/manage-link", async (route) => {
        submittedEmail = route.request().postDataJSON().email;
        await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
      });

      await page.goto("/alertes");
      await expect(page.getByRole("heading", { name: "Mes alertes prix" })).toBeVisible();
      await page.getByPlaceholder("ton@email.com").fill("  ALEX@EXAMPLE.COM  ");
      await page.getByRole("button", { name: /recevoir le lien/i }).click();

      await expect(page.getByText(/Lien envoyé à cet email/)).toBeVisible();
      expect(submittedEmail).toBe("alex@example.com");
    });

    test("EN management link uses bearer auth and removes credentials from the URL", async ({ page }) => {
      let authorization: string | undefined;
      await page.route("**/api/alerts?**", async (route) => {
        authorization = route.request().headers()["authorization"];
        await route.fulfill({ status: 200, contentType: "application/json", body: '{"alerts":[]}' });
      });
      await page.route("**/api/referral?**", (route) => route.fulfill({
        status: 200,
        contentType: "application/json",
        body: '{"code":"TEST","url":"https://example.com","credits":0,"conversions":0}',
      }));

      await page.goto("/en/alertes?email=alex%40example.com&token=test-token&source=email#manage");
      await expect(page.getByRole("heading", { name: "My price alerts" })).toBeVisible();
      await expect(page.getByText("No active alerts for alex@example.com.")).toBeVisible();
      await expect(page).toHaveURL(/\/en\/alertes\?source=email#manage$/);
      expect(authorization).toBe("Bearer test-token");
    });
  });

  test("switches a static legal page from FR to EN", async ({ page }) => {
    await page.goto("/mentions-legales");
    await expect(page.getByRole("heading", { name: "Mentions légales" })).toBeVisible();

    await page.getByRole("button", { name: /^en$/i }).click();

    await expect(page).toHaveURL(/\/en\/legal$/);
    await expect(page.getByRole("heading", { name: "Legal Notice" })).toBeVisible();
  });

  test("switches a static privacy page from EN to FR", async ({ page }) => {
    await page.goto("/en/privacy");
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();

    await page.getByRole("button", { name: /^fr$/i }).click();

    await expect(page).toHaveURL(/\/confidentialite$/);
    await expect(page.getByRole("heading", { name: "Politique de confidentialité" })).toBeVisible();
  });
});

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

  test("home URL stays authoritative over a stored language preference", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("keza:visited", "true");
      localStorage.setItem("keza_profile", JSON.stringify({ lang: "en", hasOnboarded: true }));
    });
    await page.route("**/api/portfolio", (route) => route.fulfill({ status: 401, body: "null" }));

    const profileLoaded = page.waitForResponse((response) => response.url().endsWith("/api/portfolio"));
    await page.goto("/");
    await profileLoaded;

    await expect(page.getByRole("heading", { name: /Cash ou miles \? Xalifly décide\./i })).toBeVisible();
    await expect(page).toHaveTitle(/Cash ou Miles/i);
    expect(await page.locator("html").getAttribute("lang")).toBe("fr");

    await page.evaluate(() => {
      localStorage.setItem("keza_profile", JSON.stringify({ lang: "fr", hasOnboarded: true }));
    });
    await page.goto("/en");
    await expect(page.getByRole("heading", { name: /Cash or miles\? Xalifly decides\./i })).toBeVisible();
    await expect(page).toHaveTitle(/Cash vs Miles/i);
    expect(await page.locator("html").getAttribute("lang")).toBe("en");
  });

  test("home language switch preserves the edited search draft and canonical URL", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("keza:visited", "true"));
    const siteUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://keza-taupe.vercel.app").replace(/\/$/, "");
    const initialDate = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const editedDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const returnDate = new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await page.goto("/mentions-legales");
    await page.goto(`/?from=CDG&to=JFK&date=${initialDate}`);
    await expect(page.locator("#keza-dep-date")).toHaveValue(initialDate);
    await page.locator("#keza-dep-date").fill(editedDate);
    await page.locator("#keza-ret-date").fill(returnDate);
    await page.getByRole("button", { name: "Business", exact: true }).click();
    await page.getByRole("button", { name: "Plus de passagers" }).click();

    await page.getByRole("button", { name: "en", exact: true }).click();
    await expect(page).toHaveURL(/\/en\?from=CDG&to=JFK/);
    await expect(page).toHaveTitle(/Cash vs Miles/i);
    await expect(page.locator(`link[rel="canonical"][href="${siteUrl}/en"]`).first()).toBeAttached();
    if (process.env.STRICT_CANONICAL) await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator("#keza-dep-date")).toHaveValue(editedDate);
    await expect(page.locator("#keza-ret-date")).toHaveValue(returnDate);
    await expect(page.getByRole("button", { name: "Business", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("2 pax")).toBeVisible();

    await page.getByRole("button", { name: "fr", exact: true }).click();
    await expect(page).toHaveURL(/\/\?from=CDG&to=JFK/);
    await expect(page.locator(`link[rel="canonical"][href="${siteUrl}"]`).first()).toBeAttached();
    if (process.env.STRICT_CANONICAL) await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator("#keza-dep-date")).toHaveValue(editedDate);
    await page.reload();
    await expect(page).toHaveTitle(/Cash ou Miles/i);
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await page.goBack();
    await expect(page).toHaveURL(/\/mentions-legales$/);
  });

  test("FR home exposes the search departure picker", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: /départ/i }).first()
    ).toBeVisible();
  });

  test("business language switch keeps the unsent contact draft on the matching URL", async ({ page }) => {
    let contactPosts = 0;
    await page.route("**/api/contact", (route) => {
      contactPosts += 1;
      return route.abort();
    });
    await page.goto("/entreprises?campaign=smoke#contact");
    await page.getByLabel("Nom", { exact: true }).fill("Marie Dupont");
    await page.getByLabel("Entreprise", { exact: true }).fill("Acme Corp");
    await page.getByLabel("Email professionnel").fill("marie@example.com");
    await page.getByLabel("Taille de l'équipe").selectOption("11-50");
    await page.getByLabel("Message (optionnel)").fill("Projet de voyage annuel");

    await page.getByRole("button", { name: "en", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/entreprises\?campaign=smoke#contact$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator('link[rel="canonical"][href$="/en/entreprises"]').first()).toBeAttached();
    if (process.env.STRICT_CANONICAL) await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Marie Dupont");
    await expect(page.getByLabel("Company", { exact: true })).toHaveValue("Acme Corp");
    await expect(page.getByLabel("Work email")).toHaveValue("marie@example.com");
    await expect(page.getByLabel("Team size")).toHaveValue("11-50");
    await expect(page.getByLabel("Message (optional)")).toHaveValue("Projet de voyage annuel");

    await page.getByRole("button", { name: "fr", exact: true }).click();
    await expect(page).toHaveURL(/\/entreprises\?campaign=smoke#contact$/);
    await expect(page.locator('link[rel="canonical"][href$="/entreprises"]').first()).toBeAttached();
    if (process.env.STRICT_CANONICAL) await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.getByLabel("Nom", { exact: true })).toHaveValue("Marie Dupont");
    expect(contactPosts).toBe(0);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await expect(page.getByLabel("Nom", { exact: true })).toHaveValue("");
  });

  test("comparison language switch keeps all selected destinations in the URL", async ({ page }) => {
    await page.goto("/comparer?a=CDG&b=NRT&c=DXB#comparison");
    await expect(page.getByRole("heading", { name: "Comparer des destinations" })).toBeVisible();
    for (const [slot, iata] of [[1, "CDG"], [2, "NRT"], [3, "DXB"]] as const) {
      await expect(page.getByRole("combobox", { name: `Destination ${slot}` })).toHaveValue(iata);
    }

    await page.getByRole("button", { name: "en", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/comparer\?a=CDG&b=NRT&c=DXB#comparison$/, { timeout: 15_000 });
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { name: "Compare destinations" })).toBeVisible();
    await expect(page.locator('link[rel="canonical"][href$="/en/comparer"]').first()).toBeAttached();
    if (process.env.STRICT_CANONICAL) await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    for (const [slot, iata] of [[1, "CDG"], [2, "NRT"], [3, "DXB"]] as const) {
      await expect(page.getByRole("combobox", { name: `Destination ${slot}` })).toHaveValue(iata);
    }
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { name: "Compare destinations" })).toBeVisible();
    await page.getByRole("combobox", { name: "Destination 3" }).selectOption("LHR");
    await expect(page).toHaveURL(/\/en\/comparer\?a=CDG&b=NRT&c=LHR#comparison$/, { timeout: 15_000 });

    await page.getByRole("button", { name: "fr", exact: true }).click();
    await expect(page).toHaveURL(/\/comparer\?a=CDG&b=NRT&c=LHR#comparison$/, { timeout: 15_000 });
    await expect(page.locator('link[rel="canonical"][href$="/comparer"]').first()).toBeAttached();
    if (process.env.STRICT_CANONICAL) await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Comparer des destinations" })).toBeVisible();
  });

  test.describe("mocked search", () => {
    test.use({ serviceWorkers: "block" });

    test("changing cabin keeps the newer result when the first search finishes late", async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem("keza:visited", "true"));
      const date = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      let releaseFirst!: () => void;
      const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
      let firstSeen!: () => void;
      const firstRequest = new Promise<void>((resolve) => { firstSeen = resolve; });
      let finishFirst!: () => void;
      const firstFinished = new Promise<void>((resolve) => { finishFirst = resolve; });
      const cabins: string[] = [];

      await page.route("**/api/search/stream", async (route) => {
        const cabin = route.request().postDataJSON().cabin as string;
        cabins.push(cabin);
        if (cabin === "economy") {
          firstSeen();
          await firstGate;
        }
        const result = {
          from: "CDG", to: "JFK", price: cabin === "economy" ? 500 : 900,
          totalPrice: cabin === "economy" ? 500 : 900,
          cashCost: cabin === "economy" ? 500 : 900,
          airlines: [cabin === "economy" ? "Old Airline" : "New Airline"],
          stops: 0, cabin, tripType: "oneway", passengers: 1,
          milesCost: 1000, savings: -100, recommendation: "USE_CASH",
          bestOption: null, milesOptions: [], explanation: "Cash is cheaper",
          disclaimer: "Indicative fare", source: "TP", priceConfidence: "LOW",
        };
        try {
          await route.fulfill({
            status: 200,
            contentType: "text/event-stream",
            body: `data: ${JSON.stringify({ type: "final", results: [result] })}\n\n`,
          });
        } catch {
          // A superseded request may already have been cancelled by the browser.
        } finally {
          if (cabin === "economy") finishFirst();
        }
      });

      await page.goto(`/?from=CDG&to=JFK&date=${date}&tripType=oneway`);
      await page.getByRole("button", { name: /optimiser mon vol/i }).click();
      await firstRequest;
      await page.getByRole("button", { name: "Business", exact: true }).click();
      await expect(page.getByText("New Airline")).toBeVisible();
      releaseFirst();
      await firstFinished;
      await page.waitForTimeout(300);
      await expect(page.getByText("Old Airline")).toHaveCount(0);
      await expect(page.getByText("New Airline")).toBeVisible();
      expect(cabins).toEqual(["economy", "business"]);
    });

    test("flight route language switch keeps the search draft and displayed result", async ({ page }) => {
      const departureDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const returnDate = new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      let searchRequests = 0;
      await page.route("**/api/calendar**", (route) => route.fulfill({ json: { days: [] } }));
      await page.route("**/api/search/stream", async (route) => {
        searchRequests += 1;
        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          body: `data: ${JSON.stringify({ type: "final", results: [{
            from: "DSS", to: "CDG", price: 680, totalPrice: 680, cashCost: 680,
            airlines: [], stops: 0, cabin: "economy", tripType: "roundtrip", passengers: 1,
            milesCost: 750, savings: -70, recommendation: "USE_CASH",
            bestOption: null, milesOptions: [], explanation: "Cash is cheaper",
            disclaimer: "Indicative fare", source: "TP", priceConfidence: "LOW",
          }] })}\n\n`,
        });
      });

      await page.goto("/flights/DSS-CDG?campaign=smoke#search");
      await expect(page.getByRole("heading", { name: "Vols Dakar → Paris" })).toBeVisible();
      await page.locator("#keza-dep-date").fill(departureDate);
      await page.locator("#keza-ret-date").fill(returnDate);
      await page.getByRole("button", { name: /optimiser mon vol/i }).click();
      await expect(page.getByText("1 vol trouvé")).toBeVisible();

      await page.getByRole("button", { name: "en", exact: true }).click();
      await expect(page).toHaveURL(/\/en\/flights\/DSS-CDG\?campaign=smoke#search$/);
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page.getByRole("heading", { name: "Flights Dakar → Paris" })).toBeVisible();
      await expect(page.locator('link[rel="canonical"][href$="/en/flights/DSS-CDG"]').first()).toBeAttached();
      if (process.env.STRICT_CANONICAL) await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
      await expect(page.locator("#keza-dep-date")).toHaveValue(departureDate);
      await expect(page.locator("#keza-ret-date")).toHaveValue(returnDate);
      await expect(page.getByText("1 flight found")).toBeVisible();
      expect(searchRequests).toBe(1);

      await page.getByRole("button", { name: "fr", exact: true }).click();
      await expect(page).toHaveURL(/\/flights\/DSS-CDG\?campaign=smoke#search$/);
      await expect(page.getByText("1 vol trouvé")).toBeVisible();
      expect(searchRequests).toBe(1);
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("lang", "fr");
      await expect(page.getByRole("heading", { name: "Vols Dakar → Paris" })).toBeVisible();
    });

    test("destination language switch keeps the search draft and displayed result", async ({ page }) => {
      const departureDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const returnDate = new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      let searchRequests = 0;
      await page.route("**/api/search/stream", async (route) => {
        searchRequests += 1;
        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          body: `data: ${JSON.stringify({ type: "final", results: [{
            from: "DSS", to: "DXB", price: 490, totalPrice: 490, cashCost: 490,
            airlines: [], stops: 0, cabin: "economy", tripType: "roundtrip", passengers: 1,
            milesCost: 600, savings: -110, recommendation: "USE_CASH",
            bestOption: null, milesOptions: [], explanation: "Cash is cheaper",
            disclaimer: "Indicative fare", source: "TP", priceConfidence: "LOW",
          }] })}\n\n`,
        });
      });

      await page.goto("/destinations/dxb?campaign=smoke#search");
      await expect(page.getByRole("heading", { name: "Dubaï", exact: true })).toBeVisible();
      await page.locator("#keza-dep-date").fill(departureDate);
      await page.locator("#keza-ret-date").fill(returnDate);
      await page.getByRole("button", { name: /optimiser mon vol/i }).click();
      await expect(page.getByText("1 vol trouvé")).toBeVisible();

      await page.getByRole("button", { name: "en", exact: true }).click();
      await expect(page).toHaveURL(/\/en\/destinations\/dxb\?campaign=smoke#search$/);
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page.getByRole("heading", { name: "Dubai", exact: true })).toBeVisible();
      await expect(page.locator('link[rel="canonical"][href$="/en/destinations/dxb"]').first()).toBeAttached();
      if (process.env.STRICT_CANONICAL) await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
      await expect(page.locator("#keza-dep-date")).toHaveValue(departureDate);
      await expect(page.locator("#keza-ret-date")).toHaveValue(returnDate);
      await expect(page.getByText("1 flight found")).toBeVisible();
      expect(searchRequests).toBe(1);

      await page.getByRole("button", { name: "fr", exact: true }).click();
      await expect(page).toHaveURL(/\/destinations\/dxb\?campaign=smoke#search$/);
      await expect(page.getByText("1 vol trouvé")).toBeVisible();
      expect(searchRequests).toBe(1);
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("lang", "fr");
      await expect(page.getByRole("heading", { name: "Dubaï", exact: true })).toBeVisible();
    });

    test("home language switch keeps displayed search results without another supplier request", async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem("keza:visited", "true"));
      const date = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      let searchRequests = 0;
      const requestCabins: string[] = [];
      await page.route("**/api/search/stream", async (route) => {
        searchRequests += 1;
        requestCabins.push(route.request().postDataJSON().cabin);
        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          body: `data: ${JSON.stringify({ type: "final", results: [{
            from: "CDG", to: "JFK", price: 650, totalPrice: 650, cashCost: 650,
            airlines: [], stops: 0, cabin: "economy", tripType: "oneway", passengers: 1,
            milesCost: 700, savings: -50, recommendation: "USE_CASH",
            bestOption: null, milesOptions: [], explanation: "Cash is cheaper",
            disclaimer: "Indicative fare", source: "TP", priceConfidence: "LOW",
          }], partial: false, forexRate: 1 })}\n\n`,
        });
      });
      await page.goto(`/?from=CDG&to=JFK&date=${date}&tripType=oneway`);
      const submit = page.getByRole("button", { name: /optimiser mon vol/i });
      await expect(submit).toBeEnabled();
      await submit.click();
      await expect(page.getByText("1 vol trouvé")).toBeVisible();
      await page.getByRole("button", { name: "en", exact: true }).click();
      await expect(page).toHaveURL(/\/en\?/);
      await expect(page.getByText("1 flight found")).toBeVisible();
      expect(searchRequests).toBe(1);
      await page.getByRole("button", { name: "Business", exact: true }).click();
      await expect.poll(() => searchRequests).toBe(2);
      expect(requestCabins).toEqual(["economy", "business"]);
    });

    test("switching language during partial streaming keeps the result marked partial", async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem("keza:visited", "true"));
      const date = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      await page.route("**/api/search/stream", (route) => route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: `data: ${JSON.stringify({ type: "partial", results: [{
          from: "CDG", to: "JFK", price: 650, totalPrice: 650, cashCost: 650,
          airlines: [], stops: 0, cabin: "economy", tripType: "oneway", passengers: 1,
          milesCost: 700, savings: -50, recommendation: "USE_CASH",
          bestOption: null, milesOptions: [], explanation: "Cash is cheaper",
          disclaimer: "Indicative fare", source: "TP", priceConfidence: "LOW",
        }] })}\n\n`,
      }));
      await page.goto(`/?from=CDG&to=JFK&date=${date}&tripType=oneway`);
      await page.getByRole("button", { name: /optimiser mon vol/i }).click();
      await expect(page.getByText("1 vol trouvé")).toBeVisible();
      await page.getByRole("button", { name: "en", exact: true }).click();
      await expect(page.getByText("1 flight found")).toBeVisible();
      await expect(page.getByText("Partial results shown — some sources unavailable")).toBeVisible();
    });

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

    test("FR search result creates a price alert at a 10% lower target", async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem("keza:visited", "true");
        localStorage.setItem("keza_profile", JSON.stringify({ hasOnboarded: true }));
      });
      const date = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const result = {
        from: "CDG", to: "JFK", price: 650, totalPrice: 650, cashCost: 650,
        airlines: [], stops: 0, cabin: "economy", tripType: "oneway", passengers: 1,
        milesCost: 700, savings: -50, recommendation: "USE_CASH",
        bestOption: null, milesOptions: [], explanation: "Cash is cheaper",
        disclaimer: "Indicative fare", source: "TP", priceConfidence: "LOW",
      };
      await page.route("**/api/search/stream", (route) => route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: `data: ${JSON.stringify({ type: "final", results: [result], partial: false, forexRate: 1 })}\n\n`,
      }));
      let alertBody: Record<string, unknown> | undefined;
      await page.route("**/api/alerts", async (route) => {
        alertBody = route.request().postDataJSON();
        await route.fulfill({ status: 201, contentType: "application/json", body: '{"alert":{"id":"test-alert"}}' });
      });

      await page.goto(`/?from=CDG&to=JFK&date=${date}&tripType=oneway`);
      const search = page.getByRole("button", { name: /optimiser mon vol/i });
      await expect(search).toBeEnabled();
      await search.click();
      await expect(page.getByText("Alerte prix", { exact: true })).toBeVisible();
      await page.getByPlaceholder("Votre email").fill("alex@example.com");
      await page.getByRole("button", { name: "Créer l'alerte" }).click();

      await expect(page.getByRole("main").getByText(/Alerte créée !/)).toBeVisible();
      expect(alertBody).toMatchObject({
        email: "alex@example.com", from: "CDG", to: "JFK", cabin: "economy",
        currentPrice: 650, targetPrice: 585, notifFrequency: "instant",
      });
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

    test("revoked price-alert link is removed and can be renewed", async ({ page }) => {
      let requests = 0;
      await page.route("**/api/alerts?**", (route) => route.fulfill({ status: 401, json: { error: "Unauthorized" } }));
      await page.route("**/api/alerts/manage-link", (route) => {
        requests += 1;
        return route.fulfill({ status: 200, json: { ok: true } });
      });

      await page.goto("/en/alertes?email=alex%40example.com&token=legacy-token#manage");
      await expect(page).toHaveURL(/\/en\/alertes#manage$/);
      await expect(page.getByText(/management link is no longer valid/i)).toBeVisible();
      expect(await page.evaluate(() => localStorage.getItem("keza:alertes:token"))).toBeNull();
      await page.getByRole("button", { name: /send link/i }).click();
      await expect(page.getByText(/check your email for the management link/i)).toBeVisible();
      expect(requests).toBe(1);
    });

    test("revoked miles-alert link is removed and can be renewed", async ({ page }) => {
      let requests = 0;
      await page.route("**/api/miles-alerts?**", (route) => route.fulfill({ status: 401, json: { error: "Unauthorized" } }));
      await page.route("**/api/miles-alerts/manage-link", (route) => {
        requests += 1;
        return route.fulfill({ status: 200, json: { ok: true } });
      });

      await page.goto("/en/miles-alerts?email=alex%40example.com&token=legacy-token#manage");
      await expect(page).toHaveURL(/\/en\/miles-alerts#manage$/);
      await expect(page.getByText(/management link is no longer valid/i)).toBeVisible();
      expect(await page.evaluate(() => localStorage.getItem("keza:miles-alerts:token:alex@example.com"))).toBeNull();
      await page.getByRole("button", { name: "Search" }).click();
      await expect(page.getByText(/we sent a manage link/i)).toBeVisible();
      expect(requests).toBe(1);
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

  test("FR sign-in page shows Google entry and accurate privacy link", async ({ page }) => {
    await page.goto("/connexion?callbackUrl=%2Fprofil");

    await expect(page).toHaveTitle(/Connexion/);
    await expect(page.getByRole("button", { name: "Continuer avec Google" })).toBeVisible();
    await expect(page.getByText("Tes données ne sont jamais vendues ou louées.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Politique de confidentialité" })).toHaveAttribute("href", "/confidentialite");
  });

  test("EN sign-in page shows Google entry and accurate privacy link", async ({ page }) => {
    await page.goto("/en/connexion?callbackUrl=%2Fen%2Fprofile");

    await expect(page).toHaveTitle(/Sign in/);
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    await expect(page.getByText("We do not sell or rent your data.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Privacy policy" })).toHaveAttribute("href", "/en/privacy");
  });

  test.describe("Pro pre-checkout", () => {
    test.use({ serviceWorkers: "block" });

    for (const variant of [
      { pagePath: "/pro", signInPath: "/connexion", emailPlaceholder: "ton@email.com", button: /Passer en Pro — 9\$ \/ mois/, signInButton: "Continuer avec Google" },
      { pagePath: "/en/pro", signInPath: "/en/connexion", emailPlaceholder: "you@example.com", button: /Upgrade to Pro — \$9 \/ month/, signInButton: "Continue with Google" },
    ]) {
      test(`${variant.pagePath} requires sign-in before checkout`, async ({ page }) => {
        let checkoutCalls = 0;
        await page.route("**/api/pro/checkout", (route) => {
          checkoutCalls += 1;
          return route.abort();
        });

        await page.goto(variant.pagePath);
        await page.getByPlaceholder(variant.emailPlaceholder).fill("alex@example.com");
        await page.getByRole("button", { name: variant.button }).click();

        await expect(page).toHaveURL(new RegExp(`${variant.signInPath}\\?callbackUrl=`));
        await expect(page.getByRole("button", { name: variant.signInButton })).toBeVisible();
        expect(checkoutCalls).toBe(0);
      });
    }
  });
});

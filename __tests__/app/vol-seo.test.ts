/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { metadata as volMetadata } from "@/app/vol/page";
import VolIndexPage from "@/app/vol/page";
import EnVolIndexPage from "@/app/en/vol/page";
import VolRoutePage, { generateMetadata as generateVolRouteMetadata } from "@/app/vol/[route]/page";
import { SITE_URL } from "@/lib/siteConfig";

jest.mock("@/components/Header", () => ({
  Header: ({ lang }: { lang: "fr" | "en" }) => React.createElement("header", { "data-testid": "header" }, lang),
}));

jest.mock("@/components/Footer", () => ({
  Footer: ({ lang }: { lang: "fr" | "en" }) => React.createElement("footer", { "data-testid": "footer" }, lang),
}));

jest.mock("@/components/RouteAlertCta", () => ({
  RouteAlertCta: ({ lang }: { lang: "fr" | "en" }) => React.createElement("div", { "data-testid": "route-alert" }, lang),
}));

jest.mock("@/components/PriceSparkline", () => ({
  PriceSparkline: ({ lang }: { lang: "fr" | "en" }) => React.createElement("div", { "data-testid": "price-sparkline" }, lang),
}));

jest.mock("@/components/CheapestDatesCalendar", () => ({
  CheapestDatesCalendar: ({ lang }: { lang: "fr" | "en" }) => React.createElement("div", { "data-testid": "cheapest-dates" }, lang),
}));

jest.mock("@/components/PriceHeatmap", () => ({
  PriceHeatmap: ({ lang }: { lang: "fr" | "en" }) => React.createElement("div", { "data-testid": "price-heatmap" }, lang),
}));

describe("/vol SEO metadata", () => {
  it("declares FR and EN alternates on the FR route index", () => {
    expect(volMetadata.alternates).toMatchObject({
      canonical: `${SITE_URL}/vol`,
      languages: {
        fr: `${SITE_URL}/vol`,
        en: `${SITE_URL}/en/vol`,
      },
    });
    expect(volMetadata.openGraph).toMatchObject({
      locale: "fr_FR",
      url: `${SITE_URL}/vol`,
    });
  });

  it("canonicalizes FR corridor pages to the equivalent /flights route", async () => {
    // /vol/[route] and /flights/[route] render overlapping corridor content
    // (same ROUTE_META-derived FAQ/stats) for any pair also reachable at
    // /flights, which additionally has live pricing and covers every IATA
    // pair. To avoid duplicate-content splitting, /vol/[route] declares
    // /flights/{ROUTE} as canonical instead of itself — see app/vol/[route]/page.tsx.
    const metadata = await generateVolRouteMetadata({
      params: Promise.resolve({ route: "dss-cdg" }),
    });

    expect(metadata.alternates).toMatchObject({
      canonical: `${SITE_URL}/flights/DSS-CDG`,
      languages: {
        fr: `${SITE_URL}/flights/DSS-CDG`,
        en: `${SITE_URL}/en/flights/DSS-CDG`,
      },
    });
  });
});

describe("/en/vol SEO metadata", () => {
  it("canonicalizes EN corridor pages to the equivalent /en/flights route", async () => {
    const { generateMetadata: generateEnVolRouteMetadata } = await import("@/app/en/vol/[route]/page");
    const metadata = await generateEnVolRouteMetadata({
      params: Promise.resolve({ route: "dss-cdg" }),
    });

    expect(metadata.alternates).toMatchObject({
      canonical: `${SITE_URL}/en/flights/DSS-CDG`,
      languages: {
        fr: `${SITE_URL}/flights/DSS-CDG`,
        en: `${SITE_URL}/en/flights/DSS-CDG`,
      },
    });
  });
});

describe("/vol route index layout", () => {
  it("uses the global FR layout", () => {
    render(React.createElement(VolIndexPage));

    expect(screen.getByTestId("header").textContent).toBe("fr");
    expect(screen.getByTestId("footer").textContent).toBe("fr");
    expect(screen.getByRole("heading", { name: /toutes nos routes/i })).toBeTruthy();
  });

  it("uses the global EN layout", () => {
    render(React.createElement(EnVolIndexPage));

    expect(screen.getByTestId("header").textContent).toBe("en");
    expect(screen.getByTestId("footer").textContent).toBe("en");
    expect(screen.getByRole("heading", { name: /all routes/i })).toBeTruthy();
  });
});

describe("/vol route detail layout", () => {
  it("uses the global FR layout", async () => {
    render(
      await VolRoutePage({
        params: Promise.resolve({ route: "dss-cdg" }),
      })
    );

    expect(screen.getByTestId("header").textContent).toBe("fr");
    expect(screen.getByTestId("footer").textContent).toBe("fr");
    expect(screen.getByRole("heading", { level: 1, name: /dakar.*paris/i })).toBeTruthy();
    expect(screen.getByTestId("route-alert").textContent).toBe("fr");
  });

  it("uses the global EN layout", async () => {
    const { default: EnVolRoutePage } = await import("@/app/en/vol/[route]/page");

    render(
      await EnVolRoutePage({
        params: Promise.resolve({ route: "dss-cdg" }),
      })
    );

    expect(screen.getByTestId("header").textContent).toBe("en");
    expect(screen.getByTestId("footer").textContent).toBe("en");
    expect(screen.getByRole("heading", { level: 1, name: /dakar.*paris/i })).toBeTruthy();
    expect(screen.getByTestId("route-alert").textContent).toBe("en");
  });

  it("keeps non-canonical route detail pages free of visible emoji affordances", () => {
    const fs = require("fs");
    const path = require("path");

    for (const file of ["app/vol/[route]/page.tsx", "app/en/vol/[route]/page.tsx"]) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).not.toMatch(/[✈⏱💺🛋📅✓]/u);
    }
  });
});

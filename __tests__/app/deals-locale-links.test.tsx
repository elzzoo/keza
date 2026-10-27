/** @jest-environment jsdom */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { DealsPageClient } from "@/app/deals/DealsPageClient";
import EnDealsPage from "@/app/en/deals/page";
import { dealSearchPath, enrichDeal } from "@/lib/dealsEngine";
import { SITE_URL } from "@/lib/siteConfig";

const mockRedisGet = jest.fn();

jest.mock("@/lib/redis", () => ({ redis: { get: (...args: unknown[]) => mockRedisGet(...args) } }));
jest.mock("@/lib/analytics", () => ({ trackDealsFilter: jest.fn(), trackDealShare: jest.fn() }));
jest.mock("@/components/NewsletterSignup", () => ({ NewsletterSignup: () => null }));
jest.mock("@/components/Header", () => ({ Header: () => null }));
jest.mock("@/components/Footer", () => ({ Footer: () => null }));
jest.mock("@/components/ErrorBoundary", () => ({ ErrorBoundary: ({ children }: { children: React.ReactNode }) => children }));

const deal = enrichDeal({
  from: "DSS",
  to: "CDG",
  fromFlag: "SN",
  toFlag: "FR",
  cashPrice: 680,
  milesRequired: 35000,
  program: "Flying Blue",
  cashSource: "static-example",
});

describe("localized deal links", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisGet.mockResolvedValue([deal]);
  });

  it("builds an encoded search path in the requested locale", () => {
    expect(dealSearchPath(deal, "fr")).toBe("/?from=DSS&to=CDG");
    expect(dealSearchPath(deal, "en")).toBe("/en?from=DSS&to=CDG");
    expect(dealSearchPath({ from: "A&B", to: "C D" }, "en")).toBe("/en?from=A%26B&to=C+D");
  });

  it.each([
    { lang: "fr" as const, expected: "/?from=DSS&to=CDG", label: "Analyser" },
    { lang: "en" as const, expected: "/en?from=DSS&to=CDG", label: "Analyze" },
  ])("keeps the $lang analysis and share actions in that locale", async ({ lang, expected, label }) => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

    render(<DealsPageClient initialDeals={[deal]} lang={lang} />);

    expect(screen.getByRole("link", { name: new RegExp(label) })).toHaveAttribute("href", expected);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(lang === "en" ? "Share deal" : "Partager le deal") }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(
      `${SITE_URL}${expected}&utm_source=share&utm_medium=deal`,
    ));
  });

  it("publishes an English search URL in the English structured data", async () => {
    render(await EnDealsPage());
    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const schema = JSON.parse(script!.textContent!);
    expect(schema.itemListElement[0].url).toBe(`${SITE_URL}/en?from=DSS&to=CDG`);
  });
});

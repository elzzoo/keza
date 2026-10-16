import { render, screen } from "@testing-library/react";
import { computeAffordable, ProfilClient } from "@/app/profil/ProfilClient";
import type { UserProfile } from "@/lib/userProfile";

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: null }),
}));

jest.mock("@/components/Header", () => ({
  Header: ({ lang }: { lang: "fr" | "en" }) => <header data-testid="header">{lang}</header>,
}));

jest.mock("@/components/Footer", () => ({
  Footer: ({ lang }: { lang: "fr" | "en" }) => <footer data-testid="footer">{lang}</footer>,
}));

jest.mock("@/lib/userProfile", () => ({
  BANK_CURRENCIES: [{ key: "chase", label: "Chase UR" }],
  loadProfile: () => ({
    balances: {},
    bankPoints: {},
    favoriteRoutes: [],
    recentSearches: [],
  }),
  saveProfile: jest.fn(),
}));

jest.mock("@/data/routeMeta", () => ({
  ROUTE_META: new Map([
    ["AAA-BBB", { milesToEconomy: 20000, milesToBusiness: 60000, bestPrograms: ["Flying Blue"], airlines: [], isNonstop: false }],
    ["CCC-DDD", { milesToEconomy: 15000, milesToBusiness: 40000, bestPrograms: ["Avios"], airlines: [], isNonstop: false }],
  ]),
}));

function profileWith(
  balances: Record<string, number>,
  bankPoints: Record<string, number> = {}
): UserProfile {
  return {
    programs: [],
    currency: "USD",
    lang: "fr",
    cabin: "economy",
    recentSearches: [],
    favoriteRoutes: [],
    createdAt: "2026-10-16T00:00:00.000Z",
    lastActiveAt: "2026-10-16T00:00:00.000Z",
    balances,
    bankPoints,
  };
}

describe("ProfilClient layout", () => {
  it("uses the global FR layout", async () => {
    render(<ProfilClient />);

    expect(await screen.findByTestId("header")).toHaveTextContent("fr");
    expect(screen.getByTestId("footer")).toHaveTextContent("fr");
    expect(screen.getByRole("heading", { name: /mon profil/i })).toBeInTheDocument();
  });

  it("uses the global EN layout", async () => {
    render(<ProfilClient lang="en" />);

    expect(await screen.findByTestId("header")).toHaveTextContent("en");
    expect(screen.getByTestId("footer")).toHaveTextContent("en");
    expect(screen.getByRole("heading", { name: /my profile/i })).toBeInTheDocument();
  });

  it("keeps profile UI labels free of visible emoji markers", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/profil/ProfilClient.tsx"),
      "utf8"
    );

    expect(source).not.toMatch(/[🔍❤️✈️🎁💳😔💺🪑🎯]/u);
  });

  it("does not suggest routes for unrelated miles even when the balance is high", () => {
    const profile = profileWith({ "Flying Blue": 100000 });

    expect(computeAffordable(profile).map((route) => `${route.from}-${route.to}`)).toEqual(["AAA-BBB"]);
  });

  it("recognizes British Airways Executive Club as Avios", () => {
    const profile = profileWith({ "British Airways Executive Club": 100000 });

    expect(computeAffordable(profile).map((route) => `${route.from}-${route.to}`)).toEqual(["CCC-DDD"]);
  });

  it("does not treat untransferred bank points as airline miles", () => {
    const profile = profileWith({}, { "Amex MR": 100000 });

    expect(computeAffordable(profile)).toEqual([]);
  });
});

import { render, screen } from "@testing-library/react";
import { ProfilClient } from "@/app/profil/ProfilClient";

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
});

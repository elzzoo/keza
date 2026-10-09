import { render, screen } from "@testing-library/react";
import CartePage from "@/app/carte/page";
import EnCartePage from "@/app/en/carte/page";

jest.mock("@/components/Header", () => ({
  Header: ({ lang }: { lang: "fr" | "en" }) => <header data-testid="header">{lang}</header>,
}));

jest.mock("@/components/Footer", () => ({
  Footer: ({ lang }: { lang: "fr" | "en" }) => <footer data-testid="footer">{lang}</footer>,
}));

jest.mock("@/app/carte/WorldMapClient", () => ({
  WorldMapClient: ({ lang }: { lang: "fr" | "en" }) => <div data-testid="map">{lang}</div>,
}));

jest.mock("@/app/carte/WorldMapDynamic", () => ({
  WorldMapDynamic: ({ lang }: { lang: "fr" | "en" }) => <div data-testid="map">{lang}</div>,
}));

describe("Carte pages", () => {
  it("uses the global FR layout", () => {
    render(<CartePage />);

    expect(screen.getByTestId("header")).toHaveTextContent("fr");
    expect(screen.getByTestId("footer")).toHaveTextContent("fr");
    expect(screen.getByTestId("map")).toHaveTextContent("fr");
    expect(screen.getByRole("heading", { name: /explore le monde en miles/i })).toBeInTheDocument();
  });

  it("uses the global EN layout", () => {
    render(<EnCartePage />);

    expect(screen.getByTestId("header")).toHaveTextContent("en");
    expect(screen.getByTestId("footer")).toHaveTextContent("en");
    expect(screen.getByTestId("map")).toHaveTextContent("en");
    expect(screen.getByRole("heading", { name: /explore the world with miles/i })).toBeInTheDocument();
  });

  it("keeps map pages free of visible emoji affordances", () => {
    const fs = require("fs");
    const path = require("path");

    for (const file of ["app/carte/page.tsx", "app/en/carte/page.tsx"]) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).not.toMatch(/[🗺️✈]/u);
    }
  });
});

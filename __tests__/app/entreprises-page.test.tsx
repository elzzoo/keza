import React from "react";
import { render, screen } from "@testing-library/react";
import { EntreprisesClient } from "@/app/entreprises/EntreprisesClient";

jest.mock("@/components/Header", () => ({
  Header: ({ lang }: { lang: "fr" | "en" }) => <header data-testid="header">{lang}</header>,
}));

jest.mock("@/components/Footer", () => ({
  Footer: ({ lang }: { lang: "fr" | "en" }) => <footer data-testid="footer">{lang}</footer>,
}));

describe("EntreprisesPage", () => {
  it("renders the French B2B page with trust signals and sober product markers", () => {
    render(<EntreprisesClient initialLang="fr" />);

    expect(screen.getByTestId("header")).toHaveTextContent("fr");
    expect(screen.getByRole("heading", { name: /votre équipe voyage/i })).toBeInTheDocument();
    expect(screen.getByText("33")).toBeInTheDocument();
    expect(screen.getByText("programmes miles suivis")).toBeInTheDocument();
    expect(screen.getByText("AUTO")).toBeInTheDocument();
    expect(screen.getByText("ROI")).toBeInTheDocument();
    expect(screen.getByText("OPS")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toHaveTextContent("fr");
  });

  it("renders the English B2B page from the same client without falling back to French", () => {
    render(<EntreprisesClient initialLang="en" />);

    expect(screen.getByTestId("header")).toHaveTextContent("en");
    expect(screen.getByRole("heading", { name: /your team travels/i })).toBeInTheDocument();
    expect(screen.getByText("miles programs tracked")).toBeInTheDocument();
    expect(screen.getByText("target rollout")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /request a demo/i })).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toHaveTextContent("en");
  });
});

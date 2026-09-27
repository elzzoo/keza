/**
 * @jest-environment jsdom
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { FlightRouteError } from "@/components/FlightRouteError";

jest.mock("next/link", () => {
  // eslint-disable-next-line @next/next/no-html-link-for-pages,react/display-name
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

jest.mock("@/components/Header", () => ({
  Header: ({ lang, onLangChange }: { lang: "fr" | "en"; onLangChange: (lang: "fr" | "en") => void }) => (
    <header>
      <span>{lang === "fr" ? "Header FR" : "Header EN"}</span>
      <button type="button" onClick={() => onLangChange(lang === "fr" ? "en" : "fr")}>
        toggle lang
      </button>
    </header>
  ),
}));

jest.mock("@/components/Footer", () => ({
  Footer: ({ lang }: { lang: "fr" | "en" }) => (
    <footer>{lang === "fr" ? "Footer FR" : "Footer EN"}</footer>
  ),
}));

describe("FlightRouteError", () => {
  const error = new Error("Calendar unavailable");
  const reset = jest.fn();

  beforeEach(() => {
    reset.mockClear();
  });

  it("renders the French flight error by default for French routes", () => {
    render(<FlightRouteError error={error} reset={reset} initialLang="fr" />);

    expect(screen.getByRole("heading", { name: "Erreur d'accès au vol" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour à l'accueil" })).toHaveAttribute("href", "/");
    expect(screen.getByText("Header FR")).toBeInTheDocument();
    expect(screen.getByText("Footer FR")).toBeInTheDocument();
  });

  it("renders the English flight error by default for English routes", () => {
    render(<FlightRouteError error={error} reset={reset} initialLang="en" />);

    expect(screen.getByRole("heading", { name: "Flight access error" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back home" })).toHaveAttribute("href", "/en");
    expect(screen.getByText("Header EN")).toBeInTheDocument();
    expect(screen.getByText("Footer EN")).toBeInTheDocument();
  });

  it("keeps the footer and home link aligned when language changes", () => {
    render(<FlightRouteError error={error} reset={reset} initialLang="en" />);

    fireEvent.click(screen.getByRole("button", { name: "toggle lang" }));

    expect(screen.getByRole("heading", { name: "Erreur d'accès au vol" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour à l'accueil" })).toHaveAttribute("href", "/");
    expect(screen.getByText("Footer FR")).toBeInTheDocument();
  });
});

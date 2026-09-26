/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Footer } from "@/components/Footer";

describe("Footer", () => {
  it("links French search and account items to real pages", () => {
    render(<Footer lang="fr" />);

    expect(screen.getByRole("link", { name: "Rechercher" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Mon compte" })).toHaveAttribute("href", "/compte");
  });

  it("links English legal and business items to English routes", () => {
    render(<Footer lang="en" />);

    expect(screen.getByRole("link", { name: "Legal" })).toHaveAttribute("href", "/en/legal");
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/en/privacy");
    expect(screen.getByRole("link", { name: "For Business" })).toHaveAttribute("href", "/en/entreprises");
  });

  it("links English popular routes to English route pages", () => {
    render(<Footer lang="en" />);

    expect(screen.getByRole("link", { name: "Dakar → Paris" })).toHaveAttribute(
      "href",
      "/en/flights/DSS-CDG"
    );
    expect(screen.getByRole("link", { name: "New York → London" })).toHaveAttribute(
      "href",
      "/en/flights/JFK-LHR"
    );
  });
});

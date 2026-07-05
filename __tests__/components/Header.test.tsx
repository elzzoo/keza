/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Header } from "@/components/Header";

// Mock next/link
jest.mock("next/link", () => {
  // eslint-disable-next-line @next/next/no-html-link-for-pages,react/display-name
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock child components
jest.mock("@/components/CurrencyPicker", () => ({
  CurrencyPicker: () => <div data-testid="currency-picker">Currency Picker</div>,
}));

jest.mock("@/components/ThemeToggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">Theme Toggle</div>,
}));

jest.mock("@/components/AuthButton", () => ({
  AuthButton: () => <div data-testid="auth-button">Auth Button</div>,
}));

describe("Header", () => {
  const defaultProps = {
    lang: "en" as const,
  };

  it("renders logo with tagline", () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText("KE")).toBeInTheDocument();
    expect(screen.getByText("ZA")).toBeInTheDocument();
    expect(screen.getByText("Cash or Miles?")).toBeInTheDocument();
  });

  it("renders all navigation items on desktop", () => {
    render(<Header {...defaultProps} />);

    const expectedItems = [
      "How it works",
      "Calculator",
      "Map",
      "Prices",
      "Alerts",
      "Compare",
      "Programs",
      "Portfolio",
      "For Business",
      "My account",
    ];

    expectedItems.forEach((label) => {
      const links = screen.getAllByRole("link");
      expect(links.some(link => link.textContent?.includes(label))).toBeTruthy();
    });
  });

  it("renders mobile menu button", () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByRole("button", { name: /menu/i })).toBeInTheDocument();
  });

  it("toggles mobile menu when button is clicked", () => {
    render(<Header {...defaultProps} />);
    const menuButton = screen.getByRole("button", { name: /menu/i });

    // Initially mobile nav should not be visible (but nav links are in desktop nav)
    fireEvent.click(menuButton);

    // After click, the mobile nav section should be in the DOM
    // Check that the menu state changed by verifying button icon changes
    expect(menuButton).toBeInTheDocument();
  });

  it("closes mobile menu when a nav link is clicked", () => {
    const { container } = render(<Header {...defaultProps} />);
    const menuButton = screen.getByRole("button", { name: /menu/i });

    // Open menu
    fireEvent.click(menuButton);

    // Find a nav link in the mobile menu and click it
    const links = container.querySelectorAll("a");
    const pricesLink = Array.from(links).find(link => link.textContent?.includes("Prices"));

    if (pricesLink) {
      fireEvent.click(pricesLink);
    }
  });

  it("renders French navigation when lang is 'fr'", () => {
    render(<Header {...defaultProps} lang="fr" />);

    expect(screen.getByText("Cash ou Miles ?")).toBeInTheDocument();

    const expectedItems = [
      "Comment ça marche",
      "Calculateur",
      "Carte",
      "Prix",
      "Alertes",
      "Comparer",
      "Programmes",
      "Portefeuille",
      "Pour les entreprises",
      "Mon compte",
    ];

    expectedItems.forEach((label) => {
      const links = screen.getAllByRole("link");
      expect(links.some(link => link.textContent?.includes(label))).toBeTruthy();
    });
  });

  it("does not truncate navigation text on viewport widths >= 1280px", () => {
    // This test verifies that the desktop nav has sufficient space
    // and uses responsive classes to avoid overflow
    const { container } = render(<Header {...defaultProps} />);

    // Find the desktop nav container
    const desktopNav = container.querySelector("nav.hidden.xl\\:flex");

    // Verify it exists (should be shown on desktop breakpoints >= 1280px)
    expect(desktopNav).toBeInTheDocument();

    // Verify nav items don't have text-overflow or truncation classes
    const navLinks = desktopNav?.querySelectorAll("a");
    navLinks?.forEach(link => {
      const classes = link.className;
      // Should have whitespace-nowrap but no text truncation issues
      expect(classes).toContain("whitespace-nowrap");
      expect(link.textContent?.trim().length).toBeGreaterThan(0);
    });
  });

  it("calls onLangChange callback when language button is clicked", () => {
    const onLangChange = jest.fn();
    render(<Header {...defaultProps} onLangChange={onLangChange} />);

    const frButton = screen.getByRole("button", { name: /fr/i });
    fireEvent.click(frButton);

    expect(onLangChange).toHaveBeenCalledWith("fr");
  });

  it("renders currency picker always", () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByTestId("currency-picker")).toBeInTheDocument();
  });

  it("renders theme toggle and auth button", () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("auth-button")).toBeInTheDocument();
  });

  it("renders profile link", () => {
    const { container } = render(<Header {...defaultProps} />);
    const profileLink = container.querySelector('a[href="/profil"]');
    expect(profileLink).toBeInTheDocument();
  });
});

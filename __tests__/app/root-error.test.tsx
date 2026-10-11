/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import RootError from "@/app/error";

jest.mock("next/link", () => {
  // eslint-disable-next-line @next/next/no-html-link-for-pages,react/display-name
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

jest.mock("@sentry/nextjs", () => ({
  captureException: jest.fn(),
}));

describe("root error boundary", () => {
  const reset = jest.fn();

  beforeEach(() => {
    reset.mockClear();
  });

  it("renders French recovery copy outside the English tree", () => {
    window.history.pushState({}, "", "/flights/DSS-CDG");

    render(<RootError error={new Error("boom")} reset={reset} />);

    expect(screen.getByRole("heading", { name: "Une erreur est survenue" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← Retour à l'accueil" })).toHaveAttribute("href", "/");
  });

  it("renders English recovery copy on English routes", () => {
    window.history.pushState({}, "", "/en/flights/DSS-CDG");

    render(<RootError error={new Error("boom")} reset={reset} />);

    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← Back home" })).toHaveAttribute("href", "/en");
  });

  it("keeps root error screens free of visible emoji markers", () => {
    const fs = require("fs");
    const path = require("path");
    const files = ["app/error.tsx", "app/global-error.tsx", "components/ErrorBoundary.tsx"];

    for (const file of files) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).not.toMatch(/[⚠️✈️]/u);
    }
  });
});

/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import MentionsLegales from "@/app/mentions-legales/page";
import Confidentialite from "@/app/confidentialite/page";
import LegalNotice from "@/app/en/legal/page";
import PrivacyPolicy from "@/app/en/privacy/page";

jest.mock("@/components/Header", () => ({
  Header: ({ lang }: { lang: "fr" | "en" }) => React.createElement("header", { "data-testid": "header" }, lang),
}));

jest.mock("@/components/Footer", () => ({
  Footer: ({ lang }: { lang: "fr" | "en" }) => React.createElement("footer", { "data-testid": "footer" }, lang),
}));

describe("legal pages", () => {
  it("uses the global FR layout on French legal pages", () => {
    render(React.createElement(MentionsLegales));

    expect(screen.getByTestId("header").textContent).toBe("fr");
    expect(screen.getByTestId("footer").textContent).toBe("fr");
    expect(screen.getByRole("heading", { level: 1, name: /mentions légales/i })).toBeTruthy();

    render(React.createElement(Confidentialite));

    expect(screen.getAllByTestId("header")[1]?.textContent).toBe("fr");
    expect(screen.getAllByTestId("footer")[1]?.textContent).toBe("fr");
    expect(screen.getByRole("heading", { level: 1, name: /politique de confidentialité/i })).toBeTruthy();
  });

  it("uses the global EN layout on English legal pages", () => {
    render(React.createElement(LegalNotice));

    expect(screen.getByTestId("header").textContent).toBe("en");
    expect(screen.getByTestId("footer").textContent).toBe("en");
    expect(screen.getByRole("heading", { level: 1, name: /legal notice/i })).toBeTruthy();

    render(React.createElement(PrivacyPolicy));

    expect(screen.getAllByTestId("header")[1]?.textContent).toBe("en");
    expect(screen.getAllByTestId("footer")[1]?.textContent).toBe("en");
    expect(screen.getByRole("heading", { level: 1, name: /privacy policy/i })).toBeTruthy();
  });
});

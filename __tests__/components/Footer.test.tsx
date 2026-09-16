/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Footer } from "@/components/Footer";

describe("Footer", () => {
  it("links English legal and business items to English routes", () => {
    render(<Footer lang="en" />);

    expect(screen.getByRole("link", { name: "Legal" })).toHaveAttribute("href", "/en/legal");
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/en/privacy");
    expect(screen.getByRole("link", { name: "For Business" })).toHaveAttribute("href", "/en/entreprises");
  });
});

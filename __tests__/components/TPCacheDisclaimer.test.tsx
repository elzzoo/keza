import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TPCacheDisclaimer } from "@/components/TPCacheDisclaimer";

describe("TPCacheDisclaimer", () => {
  it("renders with French text when lang=fr", () => {
    render(<TPCacheDisclaimer lang="fr" />);
    expect(
      screen.getByText("Certains prix sont mis en cache (24-48h)")
    ).toBeInTheDocument();
  });

  it("renders with English text when lang=en", () => {
    render(<TPCacheDisclaimer lang="en" />);
    expect(
      screen.getByText("Some prices are cached (24-48 hours)")
    ).toBeInTheDocument();
  });

  it("expands/collapses when clicked", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<TPCacheDisclaimer lang="fr" />);

    // Initially collapsed
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-expanded", "false");

    // Click to expand
    await user.click(button);
    rerender(<TPCacheDisclaimer lang="fr" />);
    expect(button).toHaveAttribute("aria-expanded", "true");

    // Click to collapse
    await user.click(button);
    rerender(<TPCacheDisclaimer lang="fr" />);
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("displays expanded content with correct text", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<TPCacheDisclaimer lang="fr" />);

    const button = screen.getByRole("button");
    await user.click(button);
    rerender(<TPCacheDisclaimer lang="fr" />);

    expect(
      screen.getByText(/Les tarifs affichés en orange proviennent de Travelpayouts/)
    ).toBeInTheDocument();
  });

  it("displays correct button toggle indicator", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<TPCacheDisclaimer lang="en" />);

    // Should have expand indicator
    const button = screen.getByRole("button");
    const indicator = button.querySelector(".text-blue-400\\/50");
    expect(indicator?.textContent).toBe("+");

    await user.click(button);
    rerender(<TPCacheDisclaimer lang="en" />);
    expect(indicator?.textContent).toBe("−");
  });
});

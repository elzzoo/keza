import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AwardAvailabilityDisclaimer } from "@/components/AwardAvailabilityDisclaimer";

describe("AwardAvailabilityDisclaimer", () => {
  it("renders with French text when lang=fr", () => {
    render(<AwardAvailabilityDisclaimer lang="fr" />);
    expect(
      screen.getByText("Disponibilité awards non vérifiée en temps réel")
    ).toBeInTheDocument();
  });

  it("renders with English text when lang=en", () => {
    render(<AwardAvailabilityDisclaimer lang="en" />);
    expect(
      screen.getByText("Award availability not verified in real-time")
    ).toBeInTheDocument();
  });

  it("expands/collapses when clicked", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<AwardAvailabilityDisclaimer lang="fr" />);

    // Initially collapsed
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-expanded", "false");

    // Click to expand
    await user.click(button);
    rerender(<AwardAvailabilityDisclaimer lang="fr" />);
    expect(button).toHaveAttribute("aria-expanded", "true");

    // Click to collapse
    await user.click(button);
    rerender(<AwardAvailabilityDisclaimer lang="fr" />);
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("displays expanded content with correct text", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<AwardAvailabilityDisclaimer lang="fr" />);

    const button = screen.getByRole("button");
    await user.click(button);
    rerender(<AwardAvailabilityDisclaimer lang="fr" />);

    expect(
      screen.getByText(/Vérifiez toujours la disponibilité actuelle/)
    ).toBeInTheDocument();
  });

  it("displays correct button toggle indicator", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<AwardAvailabilityDisclaimer lang="en" />);

    // Should have expand indicator
    const button = screen.getByRole("button");
    const indicator = button.querySelector(".text-orange-400\\/50");
    expect(indicator?.textContent).toBe("+");

    await user.click(button);
    rerender(<AwardAvailabilityDisclaimer lang="en" />);
    expect(indicator?.textContent).toBe("−");
  });
});

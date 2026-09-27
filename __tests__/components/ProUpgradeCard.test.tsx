import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ProUpgradeCard } from "@/components/ProUpgradeCard";

describe("ProUpgradeCard", () => {
  it("renders French copy and links by default", () => {
    render(<ProUpgradeCard daysLeft={3} />);

    expect(screen.getByText("Essai gratuit: 3 jours restants")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Passer à Xalifly Pro" })).toHaveAttribute("href", "/pro");
  });

  it("renders English copy and links when requested", () => {
    render(<ProUpgradeCard daysLeft={1} lang="en" />);

    expect(screen.getByText("Free trial: 1 day left")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Upgrade to Xalifly Pro" })).toHaveAttribute("href", "/en/pro");
    expect(screen.queryByText(/Essai gratuit/i)).not.toBeInTheDocument();
  });

  it("renders English expired state", () => {
    render(<ProUpgradeCard daysLeft={0} lang="en" />);

    expect(screen.getByText("Trial expired")).toBeInTheDocument();
  });
});

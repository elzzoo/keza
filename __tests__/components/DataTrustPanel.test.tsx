/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { DataTrustPanel } from "@/components/DataTrustPanel";

describe("DataTrustPanel", () => {
  it("explains source quality in French", () => {
    render(<DataTrustPanel lang="fr" />);

    expect(screen.getByRole("heading", { name: "Qualité des données" })).toBeInTheDocument();
    expect(screen.getByText("Prix cash live")).toBeInTheDocument();
    expect(screen.getByText(/valeurs miles\/points/)).toBeInTheDocument();
    expect(screen.getByText(/Sources : Duffel, Aviasales/)).toBeInTheDocument();
    expect(screen.getAllByText(/mai 2026/i).length).toBeGreaterThan(0);
  });

  it("renders the compact English version for the homepage", () => {
    render(<DataTrustPanel lang="en" compact />);

    expect(screen.queryByRole("heading", { name: "Data quality" })).not.toBeInTheDocument();
    expect(screen.getByText("Live cash fares")).toBeInTheDocument();
    expect(screen.getByText(/miles & points values/)).toBeInTheDocument();
    expect(screen.getByText(/programs are high confidence/)).toBeInTheDocument();
  });
});

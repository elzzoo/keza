/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { DataTrustPanel } from "@/components/DataTrustPanel";

describe("DataTrustPanel", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-22T12:00:00.000Z"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("explains source quality in French", () => {
    render(<DataTrustPanel lang="fr" />);

    expect(screen.getByRole("heading", { name: "Qualité des données" })).toBeInTheDocument();
    expect(screen.getByText("Prix cash live")).toBeInTheDocument();
    expect(screen.getByText(/valeurs miles\/points/)).toBeInTheDocument();
    expect(screen.getByText(/Sources : Duffel, Aviasales/)).toBeInTheDocument();
    expect(screen.getAllByText(/mai 2026/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Estimations anciennes · mai 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/Estimations anciennes à revalider/i)).toBeInTheDocument();
  });

  it("renders the compact English version for the homepage", () => {
    render(<DataTrustPanel lang="en" compact />);

    expect(screen.queryByRole("heading", { name: "Data quality" })).not.toBeInTheDocument();
    expect(screen.getByText("Live cash fares")).toBeInTheDocument();
    expect(screen.getByText(/miles & points values/)).toBeInTheDocument();
    expect(screen.getByText(/programs are high confidence/)).toBeInTheDocument();
    expect(screen.getByText(/Older estimates need review/i)).toBeInTheDocument();
  });

  it("does not warn when the latest reference date is recent", () => {
    jest.setSystemTime(new Date("2026-06-01T12:00:00.000Z"));
    render(<DataTrustPanel lang="en" />);

    expect(screen.getByText(/Miles reference · May 2026/)).toBeInTheDocument();
    expect(screen.queryByText(/Older estimates need review/)).not.toBeInTheDocument();
  });
});

/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EngineObservabilitySection } from "@/app/admin/components/EngineObservabilitySection";
import type { AdminStats } from "@/app/admin/data";

const engineStats: AdminStats["engineStats"] = [
  {
    date: "2026-09-25",
    searches: 10,
    cacheHits: 8,
    cacheMisses: 2,
    duffelWins: 6,
    tpWins: 4,
  },
  {
    date: "2026-09-24",
    searches: 0,
    cacheHits: 0,
    cacheMisses: 0,
    duffelWins: 0,
    tpWins: 0,
  },
];

describe("EngineObservabilitySection", () => {
  it("renders today's summary and daily table", () => {
    render(<EngineObservabilitySection engineStats={engineStats} />);

    expect(screen.getByText("Moteur de recherche — 7 derniers jours")).toBeInTheDocument();
    expect(screen.getByText("Recherches aujourd'hui")).toBeInTheDocument();
    expect(screen.getAllByText("10")).toHaveLength(2);
    expect(screen.getAllByText("80%")).toHaveLength(2);
    expect(screen.getByText("2026-09-25")).toBeInTheDocument();
    expect(screen.getByText("2026-09-24")).toBeInTheDocument();
  });

  it("renders empty summary when no engine stats exist", () => {
    render(<EngineObservabilitySection engineStats={[]} />);

    expect(screen.getByText("Recherches aujourd'hui")).toBeInTheDocument();
    expect(screen.getByText("Cache hit rate")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });
});

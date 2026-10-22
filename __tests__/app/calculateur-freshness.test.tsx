/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { CalculateurClient } from "@/app/calculateur/CalculateurClient";
import type { MilesPriceRecord } from "@/data/milesPrices";

const programs: MilesPriceRecord[] = [
  { program: "Older Miles", valueCents: 1.2, confidence: "LOW", lastUpdated: "2026-04-20" },
  { program: "Current Miles", valueCents: 1.5, confidence: "HIGH", lastUpdated: "2026-10-01" },
];

describe("calculator valuation freshness", () => {
  it.each([
    ["fr" as const, "Valeur datée du", "Estimation ancienne"],
    ["en" as const, "Value dated", "Older estimate"],
  ])("shows the selected program date and stale warning in %s", (lang, label, warning) => {
    render(<CalculateurClient programs={programs} lang={lang} asOfDate="2026-10-22" />);

    expect(screen.getByText(new RegExp(`${label} 2026-04-20`))).toBeInTheDocument();
    expect(screen.getByText(warning)).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "1" } });

    expect(screen.getByText(new RegExp(`${label} 2026-10-01`))).toBeInTheDocument();
    expect(screen.queryByText(warning)).not.toBeInTheDocument();
  });
});

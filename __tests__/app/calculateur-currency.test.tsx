/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { CalculateurClient } from "@/app/calculateur/CalculateurClient";
import type { MilesPriceRecord } from "@/data/milesPrices";

const programs: MilesPriceRecord[] = [
  { program: "Flying Blue", valueCents: 1.5, confidence: "HIGH", lastUpdated: "2026-10-01" },
];

describe("calculator currency estimates", () => {
  const displayedXof = () => Number(screen.getByText(/FCFA/).textContent?.replace(/\D/g, ""));

  it("uses the supplied USD/XOF rate instead of a hardcoded one", () => {
    const { rerender } = render(<CalculateurClient programs={programs} forexRate={650} />);
    expect(displayedXof()).toBe(750 * 650);
    expect(screen.getByText("Conversion indicative")).toBeInTheDocument();

    rerender(<CalculateurClient programs={programs} forexRate={700} />);
    expect(displayedXof()).toBe(750 * 700);
  });

  it.each([undefined, NaN, 400, 800])("omits a fabricated XOF amount for invalid rate %s", (forexRate) => {
    render(<CalculateurClient programs={programs} forexRate={forexRate} />);
    expect(screen.getByText(/taux indisponible/)).toBeInTheDocument();
    expect(screen.queryByText(/FCFA/)).not.toBeInTheDocument();
    expect(screen.getByText("$750")).toBeInTheDocument();
  });

  it("does not show unsupported EUR/GBP conversions", () => {
    const { container } = render(<CalculateurClient programs={programs} forexRate={650} lang="en" />);
    expect(container.textContent).not.toMatch(/EUR|GBP|€|£/);
    expect(screen.getByText("Approximate conversion")).toBeInTheDocument();
  });
});

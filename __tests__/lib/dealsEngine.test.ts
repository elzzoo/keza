// __tests__/lib/dealsEngine.test.ts
import {
  computeDealRatio,
  classifyDeal,
  sortDeals,
  dealPriceContext,
  type RawDeal,
} from "@/lib/dealsEngine";

describe("computeDealRatio", () => {
  it("returns cents-per-mile ratio", () => {
    // $680 cash, 35000 miles → 680*100/35000 = 1.94 cpp
    expect(computeDealRatio(680, 35000)).toBeCloseTo(1.94, 1);
  });

  it("returns 0 when milesRequired is 0", () => {
    expect(computeDealRatio(500, 0)).toBe(0);
  });
});

describe("classifyDeal", () => {
  it("returns USE_MILES when ratio > 1.5 cpp", () => {
    expect(classifyDeal(1.94)).toBe("USE_MILES");
  });

  it("returns USE_CASH when ratio < 1.0 cpp", () => {
    expect(classifyDeal(0.8)).toBe("USE_CASH");
  });

  it("returns NEUTRAL when ratio between 1.0 and 1.5", () => {
    expect(classifyDeal(1.2)).toBe("NEUTRAL");
  });
});

describe("sortDeals", () => {
  it("sorts USE_MILES deals first, then by ratio desc", () => {
    const deals: RawDeal[] = [
      { from: "CDG", to: "NRT", cashPrice: 610, milesRequired: 55000, program: "Miles&Smiles", fromFlag: "🇫🇷", toFlag: "🇯🇵" },
      { from: "DSS", to: "CDG", cashPrice: 680, milesRequired: 35000, program: "Flying Blue",  fromFlag: "🇸🇳", toFlag: "🇫🇷" },
      { from: "JFK", to: "LHR", cashPrice: 520, milesRequired: 26000, program: "Aeroplan",     fromFlag: "🇺🇸", toFlag: "🇬🇧" },
    ];
    const sorted = sortDeals(deals);
    // DSS→CDG: 1.94 cpp (USE_MILES), JFK→LHR: 2.0 cpp (USE_MILES), CDG→NRT: 1.11 cpp (NEUTRAL)
    expect(sorted[0].from).toBe("JFK"); // highest ratio USE_MILES first
    expect(sorted[1].from).toBe("DSS");
    expect(sorted[2].from).toBe("CDG"); // NEUTRAL last
  });

  it("preserves supplier provenance through enrichment", () => {
    const [deal] = sortDeals([{
      from: "DSS", to: "CDG", fromFlag: "", toFlag: "", program: "Flying Blue",
      cashPrice: 680, milesRequired: 35000,
      cashSource: "travelpayouts-month-matrix",
      cashSearchMonth: "2026-11",
      cashCheckedAt: "2026-10-20T07:00:00.000Z",
    }]);
    expect(deal.cashSource).toBe("travelpayouts-month-matrix");
    expect(deal.cashSearchMonth).toBe("2026-11");
    expect(dealPriceContext(deal, "fr")).toContain("consulté le 2026-10-20 UTC");
    expect(dealPriceContext(deal, "en")).toContain("monthly minimum (2026-11)");
  });

  it("distinguishes examples from legacy cache entries with missing provenance", () => {
    const base: RawDeal = {
      from: "DSS", to: "CDG", fromFlag: "", toFlag: "", program: "Flying Blue",
      cashPrice: 680, milesRequired: 35000,
    };
    const [legacy] = sortDeals([base]);
    const [example] = sortDeals([{ ...base, cashSource: "static-example" }]);
    expect(dealPriceContext(legacy, "fr")).toContain("Source ou date inconnue");
    expect(dealPriceContext(example, "fr")).toContain("Exemple illustratif");
    expect(dealPriceContext(example, "en")).toContain("Illustrative example");
  });

  it("does not claim freshness when supplier metadata is malformed", () => {
    const [deal] = sortDeals([{
      from: "DSS", to: "CDG", fromFlag: "", toFlag: "", program: "Flying Blue",
      cashPrice: 680, milesRequired: 35000,
      cashSource: "travelpayouts-month-matrix",
      cashSearchMonth: "2026-13",
      cashCheckedAt: "not-a-date",
    }]);
    expect(dealPriceContext(deal, "en")).toContain("Source or date unavailable");
  });
});

// __tests__/lib/costEngine.test.ts
import { buildCostOptions, type FlightInput } from "@/lib/costEngine";
import { PROGRAMS_BY_NAME } from "@/lib/globalPrograms";

const BASE: FlightInput = {
  from: "DSS",
  to: "CDG",
  totalPrice: 1_200,
  airlines: ["Air France"],
  stops: 0,
  cabin: "business",
  tripType: "roundtrip",
  passengers: 2,
};

describe("buildCostOptions", () => {
  describe("cashCost", () => {
    it("equals flight.totalPrice", () => {
      expect(buildCostOptions(BASE, new Map()).cashCost).toBe(1_200);
    });
  });

  describe("Flying Blue — DIRECT option for Air France", () => {
    it("includes Flying Blue as DIRECT", () => {
      const { milesOptions } = buildCostOptions(BASE, new Map());
      const fb = milesOptions.find((o) => o.program === "Flying Blue" && o.type === "DIRECT");
      expect(fb).toBeDefined();
    });

    it("calculates taxes as 550 × 2 pax = 1100 for AF business from DSS (no arbitrary surcharge)", () => {
      const { milesOptions } = buildCostOptions(BASE, new Map());
      const fb = milesOptions.find((o) => o.program === "Flying Blue")!;
      expect(fb.taxes).toBe(1100);
    });

    it("totalMilesCost = milesCost + taxes", () => {
      const { milesOptions } = buildCostOptions(BASE, new Map());
      const fb = milesOptions.find((o) => o.program === "Flying Blue")!;
      expect(fb.totalMilesCost).toBe(fb.milesCost + fb.taxes);
    });

    it("savings = cashCost - totalMilesCost", () => {
      const { milesOptions } = buildCostOptions(BASE, new Map());
      const fb = milesOptions.find((o) => o.program === "Flying Blue")!;
      expect(fb.savings).toBe(1_200 - fb.totalMilesCost);
    });

    it("uses chart source REAL for known zone pair", () => {
      const { milesOptions } = buildCostOptions(BASE, new Map());
      const fb = milesOptions.find((o) => o.program === "Flying Blue")!;
      expect(fb.chartSource).toBe("REAL");
    });
  });

  describe("effective prices from map", () => {
    it("uses custom value per mile from effectivePrices map (contextual: business × medium-haul = 2×)", () => {
      // BASE is business cabin, DSS→CDG ~4,400 km (medium-haul, 1.0×), business cabin (2.0×)
      // effectivePrices base = 2.5, adjusted = 2.5 × 2.0 × 1.0 = 5.0
      const prices = new Map([["Flying Blue", 2.5]]);
      const { milesOptions } = buildCostOptions(BASE, prices);
      const fb = milesOptions.find((o) => o.program === "Flying Blue")!;
      expect(fb.valuePerMile).toBeCloseTo(5.0);
    });
  });

  describe("recommendation", () => {
    it("recommendation is binary — USE_MILES or USE_CASH", () => {
      const { recommendation } = buildCostOptions(BASE, new Map());
      expect(["USE_MILES", "USE_CASH"]).toContain(recommendation);
    });

    it("USE_CASH when cash price is very low", () => {
      const cheap: FlightInput = {
        ...BASE,
        totalPrice: 50,
        cabin: "economy",
        passengers: 1,
      };
      const { recommendation } = buildCostOptions(cheap, new Map());
      expect(recommendation).toBe("USE_CASH");
    });
  });

  describe("TRANSFER options", () => {
    it("includes Amex MR → Flying Blue as TRANSFER", () => {
      const { milesOptions } = buildCostOptions(BASE, new Map());
      const t = milesOptions.find((o) => o.via === "Amex MR" && o.program === "Flying Blue");
      expect(t).toBeDefined();
      expect(t!.type).toBe("TRANSFER");
    });
  });

  describe("savings field", () => {
    it("is zero or positive", () => {
      const { savings } = buildCostOptions(BASE, new Map());
      expect(savings).toBeGreaterThanOrEqual(0);
    });
  });

  describe("deduplication", () => {
    it("does not return more than 12 options", () => {
      const { milesOptions } = buildCostOptions(BASE, new Map());
      expect(milesOptions.length).toBeLessThanOrEqual(12);
    });
  });
});

describe("binary recommendation — no EQUIVALENT", () => {
  it("never returns EQUIVALENT", () => {
    const r = buildCostOptions(BASE, new Map());
    expect(r.recommendation).not.toBe("EQUIVALENT");
    expect(["USE_MILES", "USE_CASH"]).toContain(r.recommendation);
  });

  it("USE_CASH when cash is $50 (miles always more expensive)", () => {
    const cheap: FlightInput = { ...BASE, totalPrice: 50, cabin: "economy", passengers: 1 };
    expect(buildCostOptions(cheap, new Map()).recommendation).toBe("USE_CASH");
  });
});

describe("displayMessage", () => {
  it("starts with 🔥 when USE_MILES", () => {
    const r = buildCostOptions(BASE, new Map());
    if (r.recommendation === "USE_MILES") {
      expect(r.displayMessage).toMatch(/🔥/);
    }
  });

  it("starts with 💵 when USE_CASH", () => {
    const cheap: FlightInput = { ...BASE, totalPrice: 50, cabin: "economy", passengers: 1 };
    const r = buildCostOptions(cheap, new Map());
    expect(r.recommendation).toBe("USE_CASH");
    expect(r.displayMessage).toMatch(/💵/);
  });
});

describe("disclaimer", () => {
  it("is a non-empty string on every result", () => {
    const r = buildCostOptions(BASE, new Map());
    expect(typeof r.disclaimer).toBe("string");
    expect(r.disclaimer.length).toBeGreaterThan(10);
  });
});

describe("MilesOption.explanation", () => {
  it("includes program name and miles count", () => {
    const { milesOptions } = buildCostOptions(BASE, new Map());
    const fb = milesOptions.find((o) => o.program === "Flying Blue")!;
    expect(fb.explanation).toContain("Flying Blue");
    expect(fb.explanation).toContain("miles");
  });
});

describe("MilesOption.isBestDeal", () => {
  it("exactly one option has isBestDeal = true", () => {
    const { milesOptions } = buildCostOptions(BASE, new Map());
    const best = milesOptions.filter((o) => o.isBestDeal);
    expect(best).toHaveLength(1);
  });

  it("the isBestDeal option has the lowest totalMilesCost", () => {
    const { milesOptions } = buildCostOptions(BASE, new Map());
    const best = milesOptions.find((o) => o.isBestDeal)!;
    const minCost = Math.min(...milesOptions.map((o) => o.totalMilesCost));
    expect(best.totalMilesCost).toBe(minCost);
  });
});

describe("program filtering — isBookable", () => {
  it("Aeroflot Bonus does not appear in results", () => {
    const { milesOptions } = buildCostOptions(BASE, new Map());
    const aeroflot = milesOptions.find((o) => o.program === "Aeroflot Bonus");
    expect(aeroflot).toBeUndefined();
  });

  it("IndiGo 6E Rewards does not appear in results", () => {
    const { milesOptions } = buildCostOptions(BASE, new Map());
    const indigo = milesOptions.find((o) => o.program === "IndiGo 6E Rewards");
    expect(indigo).toBeUndefined();
  });
});

describe("savings rounding in displayMessage", () => {
  it("displayMessage contains only integer dollar amounts (no decimals)", () => {
    const { displayMessage } = buildCostOptions(BASE, new Map());
    // Must not contain a decimal in the dollar amount
    expect(displayMessage).not.toMatch(/\$\d+\.\d/);
  });
});

describe("taxes — no arbitrary regional surcharge", () => {
  it("DSS→CDG and CDG→JFK use per-airline taxes without extra surcharge", () => {
    const african: FlightInput = { ...BASE, from: "DSS", to: "CDG", cabin: "business", passengers: 2, tripType: "roundtrip" };
    const european: FlightInput = { ...BASE, from: "CDG", to: "JFK", cabin: "business", passengers: 2, tripType: "roundtrip" };
    const afr = buildCostOptions(african, new Map());
    const eur = buildCostOptions(european, new Map());
    const afrFb = afr.milesOptions.find((o) => o.program === "Flying Blue");
    const eurFb = eur.milesOptions.find((o) => o.program === "Flying Blue");
    // Both use AF per-airline rate (known airline) — no hidden surcharge
    expect(afrFb).toBeDefined();
    expect(eurFb).toBeDefined();
    // AF uses consistent per-airline taxes — same rate for both routes
    expect(afrFb!.taxes).toBe(eurFb!.taxes);
  });
});

describe("accessibility scoring — score-1 programs prioritized over score-3", () => {
  it("isBestDeal is never a score-3 program when a score-1 option exists", () => {
    const { milesOptions } = buildCostOptions(BASE, new Map());
    const best = milesOptions.find((o) => o.isBestDeal)!;
    const SCORE_3_PROGRAMS = Object.values(PROGRAMS_BY_NAME)
      .filter(p => p.accessibilityScore === 3)
      .map(p => p.name);
    expect(SCORE_3_PROGRAMS).not.toContain(best.program);
  });

  it("score-1 programs appear before score-3 programs in milesOptions", () => {
    const { milesOptions } = buildCostOptions(BASE, new Map());
    const SCORE_3_PROGRAMS = Object.values(PROGRAMS_BY_NAME)
      .filter(p => p.accessibilityScore === 3)
      .map(p => p.name);
    const firstScore3Index = milesOptions.findIndex((o) => SCORE_3_PROGRAMS.includes(o.program));
    const lastScore1Index = milesOptions.reduce((last, o, i) => {
      const s = PROGRAMS_BY_NAME[o.program]?.accessibilityScore ?? 2;
      return s === 1 ? i : last;
    }, -1);
    // All score-1 programs must exist in results
    expect(lastScore1Index).toBeGreaterThan(-1);
    // If score-3 options exist, they must come after all score-1 options
    if (firstScore3Index !== -1) {
      expect(firstScore3Index).toBeGreaterThan(lastScore1Index);
    }
  });
});

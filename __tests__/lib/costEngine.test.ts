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

    it("calculates taxes for AF business DSS→CDG RT 2 pax with corridor cap", () => {
      // AF business base=$400, Europe↔Africa cap maxBusiness=$160
      // Capped per-leg: $160; RT 2-pax: 160 × 2 pax × 2 legs = 640
      const { milesOptions } = buildCostOptions(BASE, new Map());
      const fb = milesOptions.find((o) => o.program === "Flying Blue")!;
      expect(fb.taxes).toBe(640);
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
    it("uses custom value per mile from effectivePrices map (constant: no contextual adjustment)", () => {
      // valuePerMile is constant per program — no distance/cabin adjustment applied.
      // effectivePrices base = 2.5, valuePerMile = 2.5 (unchanged)
      const prices = new Map([["Flying Blue", 2.5]]);
      const { milesOptions } = buildCostOptions(BASE, prices);
      const fb = milesOptions.find((o) => o.program === "Flying Blue")!;
      expect(fb.valuePerMile).toBeCloseTo(2.5);
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
  it("starts with miles_cheaper when USE_MILES (logging format)", () => {
    const r = buildCostOptions(BASE, new Map());
    if (r.recommendation === "USE_MILES") {
      // displayMessage is a logging-only token since UI generates it client-side
      expect(r.displayMessage).toMatch(/^miles_cheaper:/);
    }
  });

  it("starts with cash_cheaper when USE_CASH (logging format)", () => {
    const cheap: FlightInput = { ...BASE, totalPrice: 50, cabin: "economy", passengers: 1 };
    const r = buildCostOptions(cheap, new Map());
    expect(r.recommendation).toBe("USE_CASH");
    // displayMessage is a logging-only token since UI generates it client-side
    expect(r.displayMessage).toMatch(/^cash_cheaper:|^no_miles_option/);
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
  it("displayMessage logging token contains an integer amount (no decimals)", () => {
    const { displayMessage } = buildCostOptions(BASE, new Map());
    // Logging format: "miles_cheaper:NNN" or "cash_cheaper:NNN" or "no_miles_option"
    // If it contains a colon, the value after must be an integer
    if (displayMessage.includes(":")) {
      const value = displayMessage.split(":")[1];
      expect(value).toMatch(/^\d+$/);
    }
  });
});

describe("taxes — corridor-aware caps (different corridors → different taxes)", () => {
  it("Africa↔Europe taxes are lower than Europe↔NA taxes for same program", () => {
    const african: FlightInput  = { ...BASE, from: "DSS", to: "CDG", cabin: "business", passengers: 2, tripType: "roundtrip" };
    const atlantic: FlightInput = { ...BASE, from: "CDG", to: "JFK", cabin: "business", passengers: 2, tripType: "roundtrip" };
    const afrResult  = buildCostOptions(african,  new Map());
    const atlaResult = buildCostOptions(atlantic, new Map());
    const afrFb  = afrResult.milesOptions.find((o) => o.program === "Flying Blue");
    const atlaFb = atlaResult.milesOptions.find((o) => o.program === "Flying Blue");
    expect(afrFb).toBeDefined();
    expect(atlaFb).toBeDefined();
    // Africa↔Europe: cap $160/leg × 2 pax × 2 = 640
    // Europe↔NA: cap $220/leg × 2 pax × 2 = 880
    // Corridor cap ensures Africa route is cheaper (realistic: DSS is shorter than JFK)
    expect(afrFb!.taxes).toBeLessThan(atlaFb!.taxes);
    expect(afrFb!.taxes).toBe(640);
    expect(atlaFb!.taxes).toBe(880);
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

// ─── Global scaling tests ────────────────────────────────────────────────────

describe("NRT → LAX (Asia → North America)", () => {
  const baseNRT: FlightInput = {
    from: "NRT", to: "LAX",
    totalPrice: 900, airlines: ["All Nippon Airways"],
    stops: 0, cabin: "economy", tripType: "roundtrip", passengers: 1,
  };

  it("includes ANA Mileage Club when operating airline is ANA", () => {
    const { milesOptions } = buildCostOptions(baseNRT, new Map());
    expect(milesOptions.find((o) => o.program === "ANA Mileage Club")).toBeDefined();
  });

  it("includes Japan Airlines Mileage Bank via corridor guarantee (even when airline is ANA)", () => {
    const { milesOptions } = buildCostOptions(baseNRT, new Map());
    expect(milesOptions.find((o) => o.program === "Japan Airlines Mileage Bank")).toBeDefined();
  });

  it("includes both ANA and JAL when airlines list contains both", () => {
    const flight: FlightInput = { ...baseNRT, airlines: ["All Nippon Airways", "Japan Airlines"] };
    const { milesOptions } = buildCostOptions(flight, new Map());
    expect(milesOptions.find((o) => o.program === "ANA Mileage Club")).toBeDefined();
    expect(milesOptions.find((o) => o.program === "Japan Airlines Mileage Bank")).toBeDefined();
  });

  it("miles for ANA Mileage Club are realistic (30K–70K RT)", () => {
    const { milesOptions } = buildCostOptions(baseNRT, new Map());
    const ana = milesOptions.find((o) => o.program === "ANA Mileage Club")!;
    expect(ana.milesRequired).toBeGreaterThanOrEqual(30_000);
    expect(ana.milesRequired).toBeLessThanOrEqual(70_000);
  });
});

describe("MIA → GRU (North America → South America)", () => {
  const baseMIA: FlightInput = {
    from: "MIA", to: "GRU",
    totalPrice: 1_000, airlines: ["LATAM Brasil"],
    stops: 0, cabin: "economy", tripType: "roundtrip", passengers: 1,
  };

  it("includes LATAM Pass", () => {
    const { milesOptions } = buildCostOptions(baseMIA, new Map());
    expect(milesOptions.find((o) => o.program === "LATAM Pass")).toBeDefined();
  });

  it("includes LifeMiles", () => {
    const { milesOptions } = buildCostOptions(baseMIA, new Map());
    expect(milesOptions.find((o) => o.program === "LifeMiles")).toBeDefined();
  });

  it("does not include Air India Flying Returns (strict regional filter)", () => {
    // Air India has no flights to South America — should be excluded
    const flight: FlightInput = { ...baseMIA, airlines: ["United"] };
    const { milesOptions } = buildCostOptions(flight, new Map());
    expect(milesOptions.find((o) => o.program === "Air India Flying Returns")).toBeUndefined();
  });

  it("LATAM Pass miles are realistic (40K–120K RT economy)", () => {
    const { milesOptions } = buildCostOptions(baseMIA, new Map());
    const latam = milesOptions.find((o) => o.program === "LATAM Pass")!;
    expect(latam.milesRequired).toBeGreaterThanOrEqual(40_000);
    expect(latam.milesRequired).toBeLessThanOrEqual(120_000);
  });
});

describe("MAD → BCN (intra-Europe short-haul)", () => {
  const baseMAD: FlightInput = {
    from: "MAD", to: "BCN",
    totalPrice: 120, airlines: ["Iberia"],
    stops: 0, cabin: "economy", tripType: "oneway", passengers: 1,
  };

  it("includes Iberia Avios Plus when operating airline is Iberia", () => {
    const { milesOptions } = buildCostOptions(baseMAD, new Map());
    expect(milesOptions.find((o) => o.program === "Iberia Avios Plus")).toBeDefined();
  });

  it("includes Iberia Avios Plus when operating airline is Vueling (Oneworld alliance)", () => {
    const flight: FlightInput = { ...baseMAD, airlines: ["Vueling"] };
    const { milesOptions } = buildCostOptions(flight, new Map());
    expect(milesOptions.find((o) => o.program === "Iberia Avios Plus")).toBeDefined();
  });

  it("Iberia Avios Plus miles for MAD→BCN are realistic short-haul (5K–25K OW)", () => {
    const { milesOptions } = buildCostOptions(baseMAD, new Map());
    const iberia = milesOptions.find((o) => o.program === "Iberia Avios Plus")!;
    expect(iberia.milesRequired).toBeGreaterThanOrEqual(5_000);
    expect(iberia.milesRequired).toBeLessThanOrEqual(25_000);
  });
});

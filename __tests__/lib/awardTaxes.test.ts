import { getAwardTaxes } from "@/data/awardTaxes";

describe("getAwardTaxes — known airlines (unchanged behaviour)", () => {
  it("returns per-airline value for Air France economy", () => {
    expect(getAwardTaxes("Air France", "economy", 1)).toBe(300);
  });

  it("returns per-airline value for British Airways business", () => {
    expect(getAwardTaxes("British Airways", "business", 2)).toBe(1400);
  });

  it("returns per-airline value for Delta economy", () => {
    expect(getAwardTaxes("Delta", "economy", 1)).toBe(50);
  });
});

describe("getAwardTaxes — unknown airline, zone-aware default", () => {
  it("UK airport (LHR) → $250 economy × 1 pax", () => {
    expect(getAwardTaxes("Unknown Air", "economy", 1, "LHR", "CDG")).toBe(250);
  });

  it("UK airport (LGW) as destination → $250 economy", () => {
    expect(getAwardTaxes("Unknown Air", "economy", 1, "CDG", "LGW")).toBe(250);
  });

  it("UK business × 2 pax = $500 × 2 = 1000", () => {
    expect(getAwardTaxes("Unknown Air", "business", 2, "LHR", "JFK")).toBe(1000);
  });

  it("Europe zone (no UK) → $150 economy", () => {
    expect(getAwardTaxes("Unknown Air", "economy", 1, "CDG", "JFK", "EUROPE", "NORTH_AMERICA")).toBe(150);
  });

  it("North America domestic → $30 economy", () => {
    expect(getAwardTaxes("Unknown Air", "economy", 1, "JFK", "LAX", "NORTH_AMERICA", "NORTH_AMERICA")).toBe(30);
  });

  it("Africa zone → $50 economy", () => {
    expect(getAwardTaxes("Unknown Air", "economy", 1, "DSS", "CDG", "AFRICA_WEST", "EUROPE")).toBe(50);
  });

  it("Middle East with UK destination fires UK rule first → $250", () => {
    expect(getAwardTaxes("Unknown Air", "economy", 1, "DXB", "LHR", "MIDDLE_EAST", "EUROPE")).toBe(250);
  });

  it("Middle East + Europe (no UK) → EUROPE rule fires → $150", () => {
    expect(getAwardTaxes("Unknown Air", "economy", 1, "DXB", "CDG", "MIDDLE_EAST", "EUROPE")).toBe(150);
  });

  it("unknown zone → $100 economy (default fallback)", () => {
    expect(getAwardTaxes("Unknown Air", "economy", 1, undefined, undefined, undefined, undefined)).toBe(100);
  });

  it("premium cabin = economy base", () => {
    expect(getAwardTaxes("Unknown Air", "premium", 1, "CDG", "JFK", "EUROPE", "NORTH_AMERICA")).toBe(150);
  });

  it("first cabin = business × 1.2", () => {
    // Europe business base = 350, first = Math.round(350 × 1.2) = 420
    expect(getAwardTaxes("Unknown Air", "first", 1, "CDG", "JFK", "EUROPE", "NORTH_AMERICA")).toBe(420);
  });
});

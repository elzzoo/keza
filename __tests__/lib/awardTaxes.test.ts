import { getAwardTaxes } from "@/data/awardTaxes";

// ---------------------------------------------------------------------------
// Known airlines — corridor caps apply.
// All expected values reflect the capped rate, not the raw base.
// ---------------------------------------------------------------------------
describe("getAwardTaxes — known airlines with corridor caps", () => {
  it("Air France economy 1 pax — no route info → global fallback cap ($150 max)", () => {
    // AF base $200, global cap maxEconomy=$150 → clamped to $150
    expect(getAwardTaxes("Air France", "economy", 1)).toBe(150);
  });

  it("British Airways business 2 pax — no route info → global fallback cap ($300 max × 2 pax)", () => {
    // BA base $500 biz, global cap maxBusiness=$300 → $300 × 2 = 600
    expect(getAwardTaxes("British Airways", "business", 2)).toBe(600);
  });

  it("Delta economy 1 pax — no route info → base unchanged (below cap)", () => {
    // Delta $50 < global cap $150
    expect(getAwardTaxes("Delta", "economy", 1)).toBe(50);
  });

  it("Air France economy 1 pax Europe→Africa — capped at $75 max", () => {
    // AF base $200, Europe↔Africa maxEconomy=$75 → $75
    expect(getAwardTaxes("Air France", "economy", 1, "CDG", "DSS", "EUROPE", "AFRICA_WEST")).toBe(75);
  });

  it("British Airways business 1 pax UK→Africa — UK cap maxBusiness=$300", () => {
    // BA base $500 biz, UK cap maxBusiness=$300 → $300
    expect(getAwardTaxes("British Airways", "business", 1, "LHR", "DSS", "EUROPE", "AFRICA_WEST")).toBe(300);
  });
});

// ---------------------------------------------------------------------------
// Unknown airlines — regional default base + corridor cap.
// ---------------------------------------------------------------------------
describe("getAwardTaxes — unknown airline, zone-aware + corridor cap", () => {
  it("UK airport (LHR) origin → UK cap maxEconomy=$150", () => {
    // Regional default UK eco=$220, UK cap=$150 → clamped to $150
    expect(getAwardTaxes("Unknown Air", "economy", 1, "LHR", "CDG")).toBe(150);
  });

  it("UK airport (LGW) as destination → UK cap maxEconomy=$150", () => {
    expect(getAwardTaxes("Unknown Air", "economy", 1, "CDG", "LGW")).toBe(150);
  });

  it("UK business × 2 pax → UK cap maxBusiness=$300 × 2 = 600", () => {
    expect(getAwardTaxes("Unknown Air", "business", 2, "LHR", "JFK")).toBe(600);
  });

  it("Europe↔NA unknown airline → Europe↔NA cap maxEconomy=$100", () => {
    // Regional default EUROPE eco=$120, cap=$100 → $100
    expect(getAwardTaxes("Unknown Air", "economy", 1, "CDG", "JFK", "EUROPE", "NORTH_AMERICA")).toBe(100);
  });

  it("North America domestic → $30 (below cap, unchanged)", () => {
    expect(getAwardTaxes("Unknown Air", "economy", 1, "JFK", "LAX", "NORTH_AMERICA", "NORTH_AMERICA")).toBe(30);
  });

  it("Africa↔Europe → Africa↔Europe cap maxEconomy=$75", () => {
    // Regional default isAfr eco=$50, cap min=$25 max=$75 → $50 (within range)
    expect(getAwardTaxes("Unknown Air", "economy", 1, "DSS", "CDG", "AFRICA_WEST", "EUROPE")).toBe(50);
  });

  it("Middle East + UK destination → UK rule fires first → cap $150", () => {
    // LHR in UK_AIRPORTS → UK cap takes priority → $150
    expect(getAwardTaxes("Unknown Air", "economy", 1, "DXB", "LHR", "MIDDLE_EAST", "EUROPE")).toBe(150);
  });

  it("Middle East + Europe (no UK) → ME cap maxEconomy=$60", () => {
    // Regional default: isEU=true → eco=$120; ME cap=$60 → clamped to $60
    expect(getAwardTaxes("Unknown Air", "economy", 1, "DXB", "CDG", "MIDDLE_EAST", "EUROPE")).toBe(60);
  });

  it("unknown zone → global fallback regional default $80 (within cap)", () => {
    expect(getAwardTaxes("Unknown Air", "economy", 1, undefined, undefined, undefined, undefined)).toBe(80);
  });

  it("premium cabin uses economy cap", () => {
    // Same as economy: Europe↔NA cap $100
    expect(getAwardTaxes("Unknown Air", "premium", 1, "CDG", "JFK", "EUROPE", "NORTH_AMERICA")).toBe(100);
  });

  it("first cabin uses business cap × 1.2 logic, bounded by maxBusiness", () => {
    // Europe↔NA: regional default first = Math.round(260 × 1.2) = 312; cap maxBusiness=220 → 220
    expect(getAwardTaxes("Unknown Air", "first", 1, "CDG", "JFK", "EUROPE", "NORTH_AMERICA")).toBe(220);
  });
});

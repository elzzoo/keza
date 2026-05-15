import {
  isBusinessMode,
  HIGH_TAXES_THRESHOLD_USD,
  buildBusinessChips,
} from "@/lib/businessMode";
import type { MilesOption } from "@/lib/costEngine";

// ── fixture helper ────────────────────────────────────────────────────────────
function makeOpt(
  program: string,
  milesRequired: number,
  taxes: number,
  isBestDeal = false
): MilesOption {
  return {
    type: "DIRECT",
    program,
    operatingAirline: "AF",
    milesRequired,
    taxes,
    valuePerMile: 1.5,
    milesCost: (milesRequired * 1.5) / 100,
    totalMilesCost: (milesRequired * 1.5) / 100 + taxes,
    savings: 0,
    confidence: "LOW",
    explanation: `${program} · ${milesRequired} miles + $${taxes}`,
    isBestDeal,
    chartSource: "REAL",
  } as MilesOption;
}

// ── isBusinessMode ────────────────────────────────────────────────────────────
describe("isBusinessMode", () => {
  it("returns true for business", () => {
    expect(isBusinessMode("business")).toBe(true);
  });

  it("returns true for first", () => {
    expect(isBusinessMode("first")).toBe(true);
  });

  it("returns false for economy", () => {
    expect(isBusinessMode("economy")).toBe(false);
  });

  it("returns false for premium", () => {
    expect(isBusinessMode("premium")).toBe(false);
  });
});

// ── HIGH_TAXES_THRESHOLD_USD ──────────────────────────────────────────────────
describe("HIGH_TAXES_THRESHOLD_USD", () => {
  it("is 300", () => {
    expect(HIGH_TAXES_THRESHOLD_USD).toBe(300);
  });
});

// ── buildBusinessChips ────────────────────────────────────────────────────────
describe("buildBusinessChips", () => {
  it("formats label as 'Program XK'", () => {
    const chips = buildBusinessChips([makeOpt("Flying Blue", 72_000, 50)]);
    expect(chips[0].label).toBe("Flying Blue 72K");
  });

  it("rounds miles to nearest K", () => {
    const chips = buildBusinessChips([makeOpt("Avios", 67_500, 50)]);
    expect(chips[0].label).toBe("Avios 68K");
  });

  it("sets highTaxes = false when taxes <= 300", () => {
    const chips = buildBusinessChips([makeOpt("Flying Blue", 72_000, 300)]);
    expect(chips[0].highTaxes).toBe(false);
  });

  it("sets highTaxes = true when taxes > 300", () => {
    const chips = buildBusinessChips([makeOpt("Miles&Smiles", 45_000, 680)]);
    expect(chips[0].highTaxes).toBe(true);
  });

  it("returns empty array for empty input", () => {
    expect(buildBusinessChips([])).toEqual([]);
  });

  it("processes multiple alternatives", () => {
    const chips = buildBusinessChips([
      makeOpt("Flying Blue", 72_000, 400),
      makeOpt("Avios", 85_000, 150),
    ]);
    expect(chips).toHaveLength(2);
    expect(chips[0].label).toBe("Flying Blue 72K");
    expect(chips[0].highTaxes).toBe(true);
    expect(chips[1].label).toBe("Avios 85K");
    expect(chips[1].highTaxes).toBe(false);
  });
});

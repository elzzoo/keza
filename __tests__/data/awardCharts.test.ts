// __tests__/data/awardCharts.test.ts
import { getMilesRequired } from "@/data/awardCharts";

describe("getMilesRequired", () => {
  it("returns Flying Blue economy AFRICA_WEST→EUROPE 1 pax oneway", () => {
    const result = getMilesRequired("Flying Blue", "AFRICA_WEST", "EUROPE", "economy", "oneway", 1);
    expect(result.miles).toBe(20_000);
    expect(result.source).toBe("REAL");
  });

  it("returns Flying Blue business AFRICA_WEST→EUROPE 2 pax roundtrip", () => {
    const result = getMilesRequired("Flying Blue", "AFRICA_WEST", "EUROPE", "business", "roundtrip", 2);
    // 62,000 × 2 pax × 2 (roundtrip) = 248,000
    expect(result.miles).toBe(248_000);
    expect(result.source).toBe("REAL");
  });

  it("returns Turkish economy AFRICA_WEST→EUROPE 1 pax oneway", () => {
    const result = getMilesRequired("Turkish Miles&Smiles", "AFRICA_WEST", "EUROPE", "economy", "oneway", 1);
    expect(result.miles).toBe(15_000);
    expect(result.source).toBe("REAL");
  });

  it("uses ESTIMATE source for unknown program", () => {
    const result = getMilesRequired("Unknown Program", "AFRICA_WEST", "EUROPE", "economy", "oneway", 1);
    expect(result.source).toBe("ESTIMATE");
    expect(result.miles).toBeGreaterThan(0);
  });

  it("uses ESTIMATE for uncovered zone pair", () => {
    const result = getMilesRequired("Flying Blue", "SOUTH_AMERICA", "ASIA", "economy", "oneway", 1);
    expect(result.source).toBe("ESTIMATE");
  });

  it("returns premium value from chart", () => {
    const premium = getMilesRequired("Flying Blue", "AFRICA_WEST", "EUROPE", "premium", "oneway", 1);
    expect(premium.miles).toBe(32_000);
    expect(premium.source).toBe("REAL");
  });
});

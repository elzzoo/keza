import { getContextualMileValue } from "@/lib/mileValue";

describe("getContextualMileValue", () => {
  const BASE = 1.5; // Flying Blue base value cents

  it("returns base value for economy medium-haul", () => {
    expect(getContextualMileValue(BASE, "economy", 4_000)).toBe(1.5);
  });

  it("multiplies by 2.0 for business cabin", () => {
    // medium-haul (1.0×) × business (2.0×) = 3.0
    expect(getContextualMileValue(BASE, "business", 4_000)).toBeCloseTo(3.0);
  });

  it("multiplies by 2.5 for first cabin", () => {
    expect(getContextualMileValue(BASE, "first", 4_000)).toBeCloseTo(3.75);
  });

  it("multiplies by 1.25 for long-haul economy (> 6000 km)", () => {
    // long-haul (1.25×) × economy (1.0×) = 1.875
    expect(getContextualMileValue(BASE, "economy", 8_000)).toBeCloseTo(1.875);
  });

  it("multiplies by 0.85 for short-haul economy (< 2000 km)", () => {
    expect(getContextualMileValue(BASE, "economy", 1_000)).toBeCloseTo(1.275);
  });

  it("stacks cabin and route multipliers: first + long-haul", () => {
    // 1.5 × 2.5 (first) × 1.25 (long) = 4.6875
    expect(getContextualMileValue(BASE, "first", 8_000)).toBeCloseTo(4.6875);
  });

  it("returns at minimum 0.5 cents", () => {
    expect(getContextualMileValue(0.1, "economy", 500)).toBeGreaterThanOrEqual(0.5);
  });
});

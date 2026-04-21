import { REGIONAL_SEASONALITY } from "@/data/seasonality";

const REGIONS = ["africa", "europe", "americas", "asia", "middle-east", "oceania"] as const;

describe("REGIONAL_SEASONALITY integrity", () => {
  it("contains all 6 regions", () => {
    REGIONS.forEach((region) => {
      expect(REGIONAL_SEASONALITY).toHaveProperty(region);
    });
  });

  it("each region has exactly 12 multipliers", () => {
    REGIONS.forEach((region) => {
      expect(REGIONAL_SEASONALITY[region]).toHaveLength(12);
    });
  });

  it("all multipliers are between 0.5 and 2.0", () => {
    REGIONS.forEach((region) => {
      REGIONAL_SEASONALITY[region].forEach((m) => {
        expect(m).toBeGreaterThanOrEqual(0.5);
        expect(m).toBeLessThanOrEqual(2.0);
      });
    });
  });

  it("sum of multipliers per region is between 10 and 14", () => {
    REGIONS.forEach((region) => {
      const sum = REGIONAL_SEASONALITY[region].reduce((a, b) => a + b, 0);
      expect(sum).toBeGreaterThanOrEqual(10);
      expect(sum).toBeLessThanOrEqual(14);
    });
  });
});

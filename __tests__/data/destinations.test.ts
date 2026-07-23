// __tests__/data/destinations.test.ts
import { DESTINATIONS } from "@/data/destinations";

describe("DESTINATIONS GPS data integrity", () => {
  it("contains exactly 42 destinations", () => {
    // 24 + 18 orphaned airports (ACC, ADD, AMS, AUH, BOG, BRU, CPT, EZE, FRA,
    // HKG, HND, KGL, KUL, LAD, MEX, AKL, SFO, SJO) referenced in
    // lib/engine/supplements.ts but previously missing from DESTINATIONS
    expect(DESTINATIONS).toHaveLength(42);
  });

  it("every destination has lat and lon", () => {
    DESTINATIONS.forEach((d) => {
      expect(typeof d.lat).toBe("number");
      expect(typeof d.lon).toBe("number");
    });
  });

  it("all lat values are valid (-90 to 90)", () => {
    DESTINATIONS.forEach((d) => {
      expect(d.lat).toBeGreaterThanOrEqual(-90);
      expect(d.lat).toBeLessThanOrEqual(90);
    });
  });

  it("all lon values are valid (-180 to 180)", () => {
    DESTINATIONS.forEach((d) => {
      expect(d.lon).toBeGreaterThanOrEqual(-180);
      expect(d.lon).toBeLessThanOrEqual(180);
    });
  });

  it("all IATA codes are unique", () => {
    const codes = DESTINATIONS.map((d) => d.iata);
    expect(new Set(codes).size).toBe(DESTINATIONS.length);
  });
});

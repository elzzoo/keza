// __tests__/data/programs.test.ts
import { PROGRAMS, type LoyaltyProgram } from "@/data/programs";

describe("PROGRAMS data integrity", () => {
  it("contains exactly 33 programs", () => {
    expect(PROGRAMS).toHaveLength(33);
  });

  it("every program has required fields", () => {
    PROGRAMS.forEach((p: LoyaltyProgram) => {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.company).toBeTruthy();
      expect(["airline", "hotel", "transfer"]).toContain(p.type);
      expect(Array.isArray(p.regions)).toBe(true);
      expect(typeof p.cpmCents).toBe("number");
      expect(Array.isArray(p.transferPartners)).toBe(true);
      expect(p.bestUse).toBeTruthy();
      expect(p.flag).toBeTruthy();
      expect(typeof p.score).toBe("number");
    });
  });

  it("all scores are between 0 and 100", () => {
    PROGRAMS.forEach((p) => {
      expect(p.score).toBeGreaterThanOrEqual(0);
      expect(p.score).toBeLessThanOrEqual(100);
    });
  });

  it("all cpmCents are plausible (> 0 and < 5)", () => {
    PROGRAMS.forEach((p) => {
      expect(p.cpmCents).toBeGreaterThan(0);
      expect(p.cpmCents).toBeLessThan(5);
    });
  });

  it("all ids are unique", () => {
    const ids = PROGRAMS.map((p) => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(PROGRAMS.length);
  });

  it("top program by score has score >= 80", () => {
    const top = Math.max(...PROGRAMS.map((p) => p.score));
    expect(top).toBeGreaterThanOrEqual(80);
  });

  it("PROGRAMS is sorted by score descending", () => {
    for (let i = 0; i < PROGRAMS.length - 1; i++) {
      expect(PROGRAMS[i].score).toBeGreaterThanOrEqual(PROGRAMS[i + 1].score);
    }
  });
});

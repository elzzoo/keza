/**
 * Unit tests for Value Scoring System
 * Tests CPP calculation, badge assignment, and percentile scoring
 */

import {
  calculateCpp,
  getValueBadge,
  calculateValueScore,
  type ValueBadge,
  type ValueScore,
} from "@/lib/valueScoring";

describe("Value Scoring System", () => {
  describe("calculateCpp", () => {
    it("should calculate CPP (cost per point) correctly", () => {
      // $1000 cash, 50K miles = 2 cents per mile
      const cpp = calculateCpp(1000, 50000);
      expect(cpp).toBe(2);
    });

    it("should handle high-value redemptions", () => {
      // $500 cash, 25K miles = 2 cents per mile
      const cpp = calculateCpp(500, 25000);
      expect(cpp).toBe(2);
    });

    it("should return Infinity for zero miles", () => {
      expect(calculateCpp(1000, 0)).toBe(Infinity);
    });

    it("should return Infinity for negative miles", () => {
      expect(calculateCpp(1000, -5000)).toBe(Infinity);
    });

    it("should round to nearest integer", () => {
      // 100 USD / 3333 miles = 3 cents (rounded from 3.0003...)
      const cpp = calculateCpp(100, 3333);
      expect(cpp).toBe(3);
    });

    it("should handle sub-cent values", () => {
      // 10 USD / 50000 miles = 0.02 cents
      const cpp = calculateCpp(10, 50000);
      expect(cpp).toBe(0);
    });
  });

  describe("getValueBadge", () => {
    const percentiles = { p25: 250, p50: 350, p75: 450 };

    it("should mark GREAT_DEAL for CPP at or below 25th percentile", () => {
      expect(getValueBadge(250, percentiles)).toBe("GREAT_DEAL");
      expect(getValueBadge(200, percentiles)).toBe("GREAT_DEAL");
    });

    it("should mark FAIR_DEAL for CPP between 25th and 75th", () => {
      expect(getValueBadge(300, percentiles)).toBe("FAIR_DEAL");
      expect(getValueBadge(350, percentiles)).toBe("FAIR_DEAL");
      expect(getValueBadge(400, percentiles)).toBe("FAIR_DEAL");
    });

    it("should mark EXPENSIVE for CPP at or above 75th percentile", () => {
      expect(getValueBadge(450, percentiles)).toBe("EXPENSIVE");
      expect(getValueBadge(500, percentiles)).toBe("EXPENSIVE");
    });

    it("should return UNKNOWN when percentiles are null", () => {
      expect(getValueBadge(300, null)).toBe("UNKNOWN");
    });

    it("should handle boundary values correctly", () => {
      // Exactly at p25
      expect(getValueBadge(250, percentiles)).toBe("GREAT_DEAL");
      // Exactly at p75
      expect(getValueBadge(450, percentiles)).toBe("EXPENSIVE");
    });
  });

  describe("calculateValueScore", () => {
    const percentiles = { p25: 200, p50: 350, p75: 500 };

    it("should calculate percentile position for GREAT_DEAL", () => {
      const score = calculateValueScore(200, percentiles);
      expect(score.badge).toBe("GREAT_DEAL");
      expect(score.percentile).toBe(0);
      expect(score.cpp).toBe(200);
    });

    it("should calculate percentile position for FAIR_DEAL", () => {
      const score = calculateValueScore(350, percentiles);
      expect(score.badge).toBe("FAIR_DEAL");
      expect(score.percentile).toBe(50);
    });

    it("should calculate percentile position for EXPENSIVE", () => {
      const score = calculateValueScore(500, percentiles);
      expect(score.badge).toBe("EXPENSIVE");
      expect(score.percentile).toBe(100);
    });

    it("should include all reference percentiles in score", () => {
      const score = calculateValueScore(350, percentiles);
      expect(score.p25).toBe(200);
      expect(score.p50).toBe(350);
      expect(score.p75).toBe(500);
    });

    it("should handle UNKNOWN with null percentiles", () => {
      const score = calculateValueScore(350, null);
      expect(score.badge).toBe("UNKNOWN");
      expect(score.percentile).toBe(0);
      expect(score.p25).toBe(0);
      expect(score.p50).toBe(0);
      expect(score.p75).toBe(0);
    });

    it("should handle narrow distribution (p25 == p75)", () => {
      const narrowPercentiles = { p25: 300, p50: 300, p75: 300 };
      const score = calculateValueScore(300, narrowPercentiles);
      expect(score.badge).toBe("GREAT_DEAL");
      expect(score.percentile).toBe(50); // Should be in middle for equal values
    });

    it("should round percentile to nearest integer", () => {
      // percentiles: p25=200, p50=350, p75=500
      // cpp=333 -> (333-200)/(500-200) * 100 = 133/300 * 100 = 44.33% ≈ 44%
      const score = calculateValueScore(333, percentiles);
      expect(score.percentile).toBe(44);
    });
  });

  describe("Edge cases", () => {
    it("should handle very large CPP values", () => {
      const cpp = calculateCpp(10000, 100000);
      expect(cpp).toBe(10);
    });

    it("should handle very small cash amounts", () => {
      const cpp = calculateCpp(50, 50000);
      expect(cpp).toBe(0);
    });

    it("should handle NaN and Infinity gracefully", () => {
      const score = calculateValueScore(NaN, { p25: 200, p50: 350, p75: 500 });
      expect(score.badge).toBe("UNKNOWN");
    });

    it("should handle all three badge types in a single distribution", () => {
      const percentiles = { p25: 250, p50: 400, p75: 550 };

      const great = calculateValueScore(200, percentiles);
      const fair = calculateValueScore(400, percentiles);
      const expensive = calculateValueScore(600, percentiles);

      expect(great.badge).toBe("GREAT_DEAL");
      expect(fair.badge).toBe("FAIR_DEAL");
      expect(expensive.badge).toBe("EXPENSIVE");

      // Verify they're in order
      expect(great.percentile).toBeLessThan(fair.percentile);
      expect(fair.percentile).toBeLessThan(expensive.percentile);
    });
  });
});

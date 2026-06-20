import {
  scoreRoute,
  isGoodDeal,
  getDealRecommendation,
  DealScore,
  DEAL_THRESHOLD,
  DISCOUNT_THRESHOLD,
} from "@/lib/dealScorer";
import { PriceBaseline } from "@/lib/mlPipeline";
import { BalanceResult } from "@/lib/balanceSync";

describe("Deal Scorer", () => {
  const baseline: PriceBaseline = {
    route: "SIN-LAX",
    avg: 750,
    stdDev: 50,
    min: 650,
    max: 900,
    count: 30,
    lastUpdated: new Date(),
  };

  const userBalances: BalanceResult[] = [
    {
      program: "Singapore KrisFlyer",
      airline: "Singapore Airlines",
      miles: 85000,
      lastSynced: new Date(),
    },
  ];

  describe("scoreRoute", () => {
    it("scores great deal (25% below average)", () => {
      const currentPrice = 550; // 26.7% below avg
      const score = scoreRoute(
        currentPrice,
        baseline,
        userBalances,
        "SIN-LAX"
      );
      expect(score).toBeGreaterThan(0.8);
      expect(score).toBeLessThanOrEqual(1);
    });

    it("scores okay deal (15% below average)", () => {
      const currentPrice = 637; // 15% below avg
      const score = scoreRoute(
        currentPrice,
        baseline,
        userBalances,
        "SIN-LAX"
      );
      expect(score).toBeGreaterThan(0.5);
      expect(score).toBeLessThan(0.8);
    });

    it("returns low score for above-average price", () => {
      const currentPrice = 850; // Above avg
      const score = scoreRoute(
        currentPrice,
        baseline,
        userBalances,
        "SIN-LAX"
      );
      expect(score).toBeLessThan(0.3);
    });

    it("boosts score if user has sufficient miles", () => {
      const currentPrice = 550;
      const withMiles = scoreRoute(
        currentPrice,
        baseline,
        userBalances,
        "SIN-LAX"
      );
      const withoutMiles = scoreRoute(
        currentPrice,
        baseline,
        [],
        "SIN-LAX"
      );
      expect(withMiles).toBeGreaterThan(withoutMiles);
    });

    it("returns 0 if baseline is null", () => {
      const score = scoreRoute(550, null, userBalances, "SIN-LAX");
      expect(score).toBe(0);
    });

    it("penalizes high volatility", () => {
      const highVolatilityBaseline: PriceBaseline = {
        ...baseline,
        stdDev: 150, // >15% of avg (750)
      };
      const currentPrice = 550;
      const normalScore = scoreRoute(currentPrice, baseline, [], "SIN-LAX");
      const volatileScore = scoreRoute(
        currentPrice,
        highVolatilityBaseline,
        [],
        "SIN-LAX"
      );
      expect(volatileScore).toBeLessThan(normalScore);
    });

    it("caps score at 1.0", () => {
      // Create a scenario that would boost above 1.0 if uncapped
      const extremeBaseline: PriceBaseline = {
        ...baseline,
        avg: 750,
        stdDev: 10, // Low volatility
      };
      const score = scoreRoute(500, extremeBaseline, userBalances, "SIN-LAX");
      expect(score).toBeLessThanOrEqual(1);
    });

    it("caps score at 0", () => {
      // Create a scenario that would go negative if uncapped
      const score = scoreRoute(1000, baseline, [], "SIN-LAX");
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe("isGoodDeal", () => {
    it("identifies good deals (score >= 0.7)", () => {
      expect(isGoodDeal(0.75, 500, baseline)).toBe(true);
    });

    it("rejects poor deals (score < 0.7 and discount < 15%)", () => {
      // Price of 760 is only 1.3% discount
      expect(isGoodDeal(0.65, 760, baseline)).toBe(false);
    });

    it("identifies great discounts (>= 15%)", () => {
      const cheapPrice = 637.5; // Exactly 15% below 750
      expect(isGoodDeal(0.5, cheapPrice, baseline)).toBe(true);
    });

    it("rejects small discounts (< 15%)", () => {
      const smallDiscount = 700; // Only ~6.7% below 750
      expect(isGoodDeal(0.5, smallDiscount, baseline)).toBe(false);
    });
  });

  describe("getDealRecommendation", () => {
    it("returns exceptional message for very high score", () => {
      const msg = getDealRecommendation(0.85);
      expect(msg).toBe("Exceptional deal! Book immediately.");
    });

    it("returns great deal message for high score", () => {
      const msg = getDealRecommendation(0.75);
      expect(msg).toBe("Great deal for you!");
    });

    it("returns good price message for moderate score", () => {
      const msg = getDealRecommendation(0.65);
      expect(msg).toBe("Good price.");
    });

    it("returns fair price message for low score", () => {
      const msg = getDealRecommendation(0.5);
      expect(msg).toBe("Fair price.");
    });

    it("returns not a deal message for very low score", () => {
      const msg = getDealRecommendation(0.3);
      expect(msg).toBe("Not a deal.");
    });

    it("handles boundary at 0.85", () => {
      const msg1 = getDealRecommendation(0.84);
      const msg2 = getDealRecommendation(0.85);
      expect(msg1).not.toBe(msg2);
      expect(msg2).toBe("Exceptional deal! Book immediately.");
    });
  });

  describe("DEAL_THRESHOLD constant", () => {
    it("equals 0.7", () => {
      expect(DEAL_THRESHOLD).toBe(0.7);
    });
  });

  describe("DISCOUNT_THRESHOLD constant", () => {
    it("equals 0.85", () => {
      expect(DISCOUNT_THRESHOLD).toBe(0.85);
    });
  });
});

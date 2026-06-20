import {
  aggregateUserHistory,
  calculateBaselineMetrics,
  PriceBaseline,
  UserSearchHistory,
} from "@/lib/mlPipeline";

describe("ML Training Pipeline", () => {
  describe("aggregateUserHistory", () => {
    it("aggregates user search history from Redis", async () => {
      const history = await aggregateUserHistory("user@example.com", 90);

      expect(history).toHaveProperty("email");
      expect(history).toHaveProperty("routes");
      expect(history).toHaveProperty("dates");
      expect(history).toHaveProperty("prices");
      expect(Array.isArray(history.routes)).toBe(true);
    });

    it("returns expected structure", async () => {
      const history = await aggregateUserHistory("test@example.com");

      expect(history.email).toBe("test@example.com");
      expect(Array.isArray(history.routes)).toBe(true);
      expect(Array.isArray(history.dates)).toBe(true);
      expect(Array.isArray(history.prices)).toBe(true);
    });
  });

  describe("calculateBaselineMetrics", () => {
    it("calculates baseline metrics for route", () => {
      const prices = [680, 700, 650, 720, 685, 690];
      const baseline = calculateBaselineMetrics(prices);

      expect(baseline).not.toBeNull();
      expect(baseline).toHaveProperty("avg");
      expect(baseline).toHaveProperty("stdDev");
      expect(baseline).toHaveProperty("min");
      expect(baseline).toHaveProperty("max");
      expect(baseline).toHaveProperty("count");
      expect(baseline).toHaveProperty("lastUpdated");
    });

    it("calculates average correctly", () => {
      const prices = [680, 700, 650, 720, 685, 690];
      const baseline = calculateBaselineMetrics(prices);

      expect(baseline).not.toBeNull();
      const expected = prices.reduce((a, b) => a + b, 0) / prices.length;
      expect(baseline!.avg).toBe(expected);
    });

    it("identifies min and max correctly", () => {
      const prices = [680, 700, 650, 720, 685, 690];
      const baseline = calculateBaselineMetrics(prices);

      expect(baseline).not.toBeNull();
      expect(baseline!.min).toBe(650);
      expect(baseline!.max).toBe(720);
    });

    it("calculates standard deviation", () => {
      const prices = [680, 700, 650, 720, 685, 690];
      const baseline = calculateBaselineMetrics(prices);

      expect(baseline).not.toBeNull();
      expect(baseline!.stdDev).toBeGreaterThan(0);
      expect(typeof baseline!.stdDev).toBe("number");
    });

    it("returns null for routes with <5 data points", () => {
      const baseline = calculateBaselineMetrics([680]);
      expect(baseline).toBeNull();
    });

    it("returns null for routes with exactly 4 data points", () => {
      const baseline = calculateBaselineMetrics([680, 700, 650, 720]);
      expect(baseline).toBeNull();
    });

    it("accepts exactly 5 data points", () => {
      const baseline = calculateBaselineMetrics([680, 700, 650, 720, 685]);
      expect(baseline).not.toBeNull();
      expect(baseline!.count).toBe(5);
    });

    it("includes count in result", () => {
      const prices = [680, 700, 650, 720, 685, 690];
      const baseline = calculateBaselineMetrics(prices);

      expect(baseline).not.toBeNull();
      expect(baseline!.count).toBe(6);
    });

    it("includes lastUpdated as Date", () => {
      const baseline = calculateBaselineMetrics([680, 700, 650, 720, 685]);

      expect(baseline).not.toBeNull();
      expect(baseline!.lastUpdated instanceof Date).toBe(true);
    });
  });
});

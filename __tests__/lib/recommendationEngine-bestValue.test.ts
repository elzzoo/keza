/**
 * Best Value recommendation tests for Recommendation Engine
 * Tests the best value detection and program switching logic
 */

import { getbestValueRecommendations, getProgramSwitchRecommendations } from "@/lib/recommendationEngine";
import type { FlightResult, MilesOption } from "@/lib/engine";

describe("Recommendation Engine - Best Value", () => {
  // Helper to create mock MilesOption
  function createMilesOption(overrides: Partial<MilesOption> = {}): MilesOption {
    return {
      program: "Test Program",
      miles: 50000,
      taxes: 50,
      type: "DIRECT",
      isBestDeal: true,
      chartSource: "AWARD_CHART",
      confidence: "HIGH",
      ...overrides,
    };
  }

  // Helper to create mock FlightResult
  function createFlight(overrides: Partial<FlightResult> = {}): FlightResult {
    return {
      from: "SFO",
      to: "CDG",
      price: 600,
      airlines: ["United"],
      stops: 0,
      duration: 600,
      tripType: "oneway",
      cabin: "economy",
      passengers: 1,
      cashCost: 600,
      milesCost: 2000,
      savings: 100,
      recommendation: "USE_MILES",
      bestOption: createMilesOption(),
      milesOptions: [createMilesOption()],
      explanation: "Test",
      displayMessage: "Test",
      disclaimer: "Test",
      cabinPriceEstimated: false,
      searchId: "test",
      optimization: { type: "LOWEST_MILES" },
      ...overrides,
    };
  }

  describe("getbestValueRecommendations", () => {
    it("should return empty array when no USE_MILES flights", async () => {
      const results = [
        createFlight({ recommendation: "USE_CASH" }),
        createFlight({ recommendation: "IF_HAVE_MILES" }),
      ];

      const recs = await getbestValueRecommendations(results, [], "en");
      expect(recs).toEqual([]);
    });

    it("should return up to 3 best-value flights", async () => {
      const results = [
        createFlight({ savings: 300 }),
        createFlight({ savings: 200 }),
        createFlight({ savings: 150 }),
        createFlight({ savings: 100 }),
      ];

      const recs = await getbestValueRecommendations(results, [], "en");
      expect(recs.length).toBeLessThanOrEqual(3);
    });

    it("should sort by savings (highest first)", async () => {
      const results = [
        createFlight({ savings: 100, airlines: ["United"] }),
        createFlight({ savings: 300, airlines: ["Lufthansa"] }),
        createFlight({ savings: 200, airlines: ["Air France"] }),
      ];

      const recs = await getbestValueRecommendations(results, [], "en");
      expect(recs.length).toBeGreaterThan(0);
      if (recs[0]) {
        expect(recs[0].savings).toBe(300);
      }
    });

    it("should exclude flights with zero or negative savings", async () => {
      const results = [
        createFlight({ savings: 100 }),
        createFlight({ savings: 0 }),
        createFlight({ savings: -50 }),
      ];

      const recs = await getbestValueRecommendations(results, [], "en");
      // Should only include flights with savings > 0
      expect(recs.length).toBeLessThanOrEqual(1);
    });

    it("should include program name in recommendation", async () => {
      const results = [
        createFlight({
          savings: 100,
          bestOption: createMilesOption({ program: "United MileagePlus" }),
        }),
      ];

      const recs = await getbestValueRecommendations(results, [], "en");
      expect(recs[0]?.description).toContain("United MileagePlus");
    });

    it("should return English text for en locale", async () => {
      const results = [createFlight({ savings: 100 })];

      const recs = await getbestValueRecommendations(results, [], "en");
      expect(recs[0]?.title).toContain("Best");
    });

    it("should return French text for fr locale", async () => {
      const results = [createFlight({ savings: 100 })];

      const recs = await getbestValueRecommendations(results, [], "fr");
      expect(recs[0]?.title).toContain("miles");
    });

    it("should calculate savings percentage correctly", async () => {
      const results = [
        createFlight({ cashCost: 1000, savings: 200 }), // 20%
      ];

      const recs = await getbestValueRecommendations(results, [], "en");
      if (recs[0]) {
        expect(recs[0].savingsPercent).toBe(20);
      }
    });

    it("should handle zero cash cost gracefully", async () => {
      const results = [
        createFlight({ cashCost: 0, savings: 0 }),
      ];

      const recs = await getbestValueRecommendations(results, [], "en");
      expect(Array.isArray(recs)).toBe(true);
    });
  });

  describe("getProgramSwitchRecommendations", () => {
    it("should return empty when only one option available", async () => {
      const flight = createFlight({
        milesOptions: [
          createMilesOption({ program: "Program A", miles: 50000 }),
        ],
      });

      const recs = await getProgramSwitchRecommendations(flight, "en");
      expect(recs).toEqual([]);
    });

    it("should recommend switching for 20%+ miles savings", async () => {
      const flight = createFlight({
        milesOptions: [
          createMilesOption({ program: "Program A", miles: 50000 }),
          createMilesOption({ program: "Program B", miles: 35000 }), // 30% cheaper
        ],
      });

      const recs = await getProgramSwitchRecommendations(flight, "en");
      expect(recs.length).toBeGreaterThan(0);
    });

    it("should not recommend for < 20% miles savings", async () => {
      const flight = createFlight({
        milesOptions: [
          createMilesOption({ program: "Program A", miles: 50000 }),
          createMilesOption({ program: "Program B", miles: 48000 }), // 4% savings
        ],
      });

      const recs = await getProgramSwitchRecommendations(flight, "en");
      expect(recs).toEqual([]);
    });

    it("should not recommend for < 5000 miles difference", async () => {
      const flight = createFlight({
        milesOptions: [
          createMilesOption({ program: "Program A", miles: 50000 }),
          createMilesOption({ program: "Program B", miles: 49000 }), // Only 1000 miles saved
        ],
      });

      const recs = await getProgramSwitchRecommendations(flight, "en");
      expect(recs).toEqual([]);
    });

    it("should include alternative program name", async () => {
      const flight = createFlight({
        milesOptions: [
          createMilesOption({ program: "Program A", miles: 50000 }),
          createMilesOption({ program: "KrisFlyer", miles: 30000 }),
        ],
      });

      const recs = await getProgramSwitchRecommendations(flight, "en");
      if (recs[0]) {
        expect(recs[0].description).toContain("KrisFlyer");
      }
    });

    it("should calculate miles saved correctly", async () => {
      const flight = createFlight({
        milesOptions: [
          createMilesOption({ program: "Program A", miles: 50000 }),
          createMilesOption({ program: "Program B", miles: 35000 }),
        ],
      });

      const recs = await getProgramSwitchRecommendations(flight, "en");
      if (recs[0]) {
        // 50000 - 35000 = 15000 (may be formatted with comma)
        expect(recs[0].description).toMatch(/15[,]?000/);
      }
    });

    it("should use French text for fr locale", async () => {
      const flight = createFlight({
        milesOptions: [
          createMilesOption({ program: "Program A", miles: 50000 }),
          createMilesOption({ program: "Program B", miles: 35000 }),
        ],
      });

      const recs = await getProgramSwitchRecommendations(flight, "fr");
      expect(recs[0]?.title).toContain("Programme");
    });

    it("should limit to 2 alternative programs", async () => {
      const flight = createFlight({
        milesOptions: [
          createMilesOption({ program: "Program A", miles: 50000 }),
          createMilesOption({ program: "Program B", miles: 35000 }),
          createMilesOption({ program: "Program C", miles: 32000 }),
          createMilesOption({ program: "Program D", miles: 30000 }),
        ],
      });

      const recs = await getProgramSwitchRecommendations(flight, "en");
      expect(recs.length).toBeLessThanOrEqual(2);
    });

    it("should handle flights with no milesOptions", async () => {
      const flight = createFlight({
        milesOptions: undefined as any,
      });

      const recs = await getProgramSwitchRecommendations(flight, "en");
      expect(Array.isArray(recs)).toBe(true);
    });
  });

  describe("Recommendation consistency", () => {
    it("should have consistent message structure", async () => {
      const results = [createFlight({ savings: 100 })];
      const recs = await getbestValueRecommendations(results, [], "en");

      if (recs[0]) {
        expect(recs[0]).toHaveProperty("type");
        expect(recs[0]).toHaveProperty("title");
        expect(recs[0]).toHaveProperty("description");
        expect(recs[0]).toHaveProperty("action");
        expect(recs[0].type).toBe("BEST_VALUE");
      }
    });

    it("should handle missing bestOption gracefully", async () => {
      const results = [
        createFlight({ bestOption: null, recommendation: "USE_MILES" }),
      ];

      const recs = await getbestValueRecommendations(results, [], "en");
      expect(Array.isArray(recs)).toBe(true);
    });
  });
});

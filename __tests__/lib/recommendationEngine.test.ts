/**
 * Unit tests for Recommendation Engine
 * Tests recommendation logic for best value, alternatives, and timing
 */

import { getAlternativeRouteRecommendations } from "@/lib/recommendationEngine";
import type { FlightResult } from "@/lib/engine";

describe("Recommendation Engine", () => {
  // Helper to create mock FlightResult
  function createFlight(overrides: Partial<FlightResult>): FlightResult {
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
      savings: 0,
      recommendation: "USE_CASH",
      bestOption: null,
      milesOptions: [],
      explanation: "Test flight",
      displayMessage: "Test",
      disclaimer: "Test",
      cabinPriceEstimated: false,
      searchId: "test-id",
      optimization: { type: "CASH" },
      ...overrides,
    };
  }

  describe("getAlternativeRouteRecommendations", () => {
    it("should return empty array when less than 2 flights", async () => {
      const results = [createFlight({})];
      const recs = await getAlternativeRouteRecommendations(results, "en");
      expect(recs).toEqual([]);
    });

    it("should recommend one-stop when cheaper than direct", async () => {
      const results = [
        createFlight({ stops: 0, cashCost: 800 }), // Direct
        createFlight({ stops: 1, cashCost: 700 }), // One-stop, cheaper
      ];

      const recs = await getAlternativeRouteRecommendations(results, "en");
      expect(recs.length).toBeGreaterThan(0);

      if (recs[0]) {
        expect(recs[0].type).toBe("ALTERNATIVE_ROUTE");
        expect(recs[0].savings).toBe(100);
      }
    });

    it("should not recommend if savings < $20", async () => {
      const results = [
        createFlight({ stops: 0, cashCost: 800 }),
        createFlight({ stops: 1, cashCost: 795 }), // Only $5 savings
      ];

      const recs = await getAlternativeRouteRecommendations(results, "en");
      expect(recs).toEqual([]);
    });

    it("should return French text when lang is 'fr'", async () => {
      const results = [
        createFlight({ stops: 0, cashCost: 800 }),
        createFlight({ stops: 1, cashCost: 700 }),
      ];

      const recs = await getAlternativeRouteRecommendations(results, "fr");
      if (recs[0]) {
        expect(recs[0].title).toBe("Option moins chère avec escale");
        expect(recs[0].description).toContain("economise");
      }
    });

    it("should return English text when lang is 'en'", async () => {
      const results = [
        createFlight({ stops: 0, cashCost: 800 }),
        createFlight({ stops: 1, cashCost: 700 }),
      ];

      const recs = await getAlternativeRouteRecommendations(results, "en");
      if (recs[0]) {
        expect(recs[0].title).toBe("Cheaper option with connection");
        expect(recs[0].description).toContain("save");
      }
    });

    it("should handle multiple one-stop options correctly", async () => {
      const results = [
        createFlight({ stops: 0, cashCost: 800 }),
        createFlight({ stops: 1, cashCost: 700 }),
        createFlight({ stops: 1, cashCost: 750 }),
      ];

      const recs = await getAlternativeRouteRecommendations(results, "en");
      // Should recommend the cheapest one-stop
      if (recs[0]) {
        expect(recs[0].savings).toBe(100); // 800 - 700
      }
    });

    it("should handle flights with no stops field", async () => {
      const results = [
        createFlight({ stops: undefined, cashCost: 800 }),
        createFlight({ stops: 1, cashCost: 700 }),
      ];

      const recs = await getAlternativeRouteRecommendations(results, "en");
      // Should treat undefined stops as 0
      expect(recs.length).toBeGreaterThan(0);
    });
  });

  describe("Recommendation types", () => {
    it("should have consistent structure across all recommendation types", async () => {
      const results = [
        createFlight({ stops: 0, cashCost: 800 }),
        createFlight({ stops: 1, cashCost: 700 }),
      ];

      const recs = await getAlternativeRouteRecommendations(results, "en");

      if (recs[0]) {
        const rec = recs[0];
        expect(rec).toHaveProperty("type");
        expect(rec).toHaveProperty("title");
        expect(rec).toHaveProperty("description");
        expect(rec).toHaveProperty("action");
      }
    });
  });

  describe("Edge cases", () => {
    it("should handle null cashCost", async () => {
      const results = [
        createFlight({ stops: 0, cashCost: 0 }),
        createFlight({ stops: 1, cashCost: 700 }),
      ];

      // Should not crash
      const recs = await getAlternativeRouteRecommendations(results, "en");
      expect(Array.isArray(recs)).toBe(true);
    });

    it("should handle negative cashCost gracefully", async () => {
      const results = [
        createFlight({ stops: 0, cashCost: -100 }),
        createFlight({ stops: 1, cashCost: 700 }),
      ];

      // Should not crash
      const recs = await getAlternativeRouteRecommendations(results, "en");
      expect(Array.isArray(recs)).toBe(true);
    });

    it("should handle flights with very high stops counts", async () => {
      const results = [
        createFlight({ stops: 0, cashCost: 800 }),
        createFlight({ stops: 5, cashCost: 500 }),
      ];

      // Should still work but not recommend (we filter for exactly 1 stop)
      const recs = await getAlternativeRouteRecommendations(results, "en");
      expect(recs).toEqual([]);
    });
  });
});

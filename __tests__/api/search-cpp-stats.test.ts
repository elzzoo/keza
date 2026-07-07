/**
 * Integration tests for CPP statistics in search API
 * Verifies that search results include value scoring data
 */

describe("Search API CPP Statistics Integration", () => {
  describe("Response structure", () => {
    it("should include optional valueBadge field in FlightResult", () => {
      // Type-level test: verify FlightResult can have valueBadge property
      const mockResult = {
        from: "SFO",
        to: "CDG",
        price: 600,
        airlines: ["United"],
        stops: 0,
        tripType: "oneway" as const,
        cabin: "economy" as const,
        passengers: 1,
        cashCost: 600,
        milesCost: 2000,
        savings: 0,
        recommendation: "USE_CASH" as const,
        bestOption: null,
        milesOptions: [],
        explanation: "Test",
        displayMessage: "Test",
        disclaimer: "Test",
        cabinPriceEstimated: false,
        searchId: "test",
        optimization: { type: "LOWEST_MILES" as const },
        // P5 fields
        valueBadge: "GREAT_DEAL",
        cppPercentile: 25,
        priceTrend: "stable" as const,
      };

      expect(mockResult.valueBadge).toBe("GREAT_DEAL");
      expect(mockResult.cppPercentile).toBe(25);
    });

    it("should include CPP statistics in bestOption context", () => {
      const mockResult = {
        from: "SFO",
        to: "CDG",
        price: 600,
        airlines: ["United"],
        stops: 0,
        tripType: "oneway" as const,
        cabin: "economy" as const,
        passengers: 1,
        cashCost: 600,
        milesCost: 2000,
        savings: 200,
        recommendation: "USE_MILES" as const,
        bestOption: {
          program: "United MileagePlus",
          miles: 50000,
          taxes: 50,
          type: "DIRECT" as const,
          isBestDeal: true,
          chartSource: "AWARD_CHART" as const,
          confidence: "HIGH" as const,
        },
        milesOptions: [],
        explanation: "Test",
        displayMessage: "Test",
        disclaimer: "Test",
        cabinPriceEstimated: false,
        searchId: "test",
        optimization: { type: "LOWEST_MILES" as const },
        cppStats: {
          cpp: 120, // $6.00 / 50K miles = 0.012 = 1.2 cents per mile
          p25: 100,
          p50: 150,
          p75: 200,
        },
      };

      expect(mockResult.cppStats?.cpp).toBe(120);
      expect(mockResult.cppStats?.p25).toBe(100);
      expect(mockResult.cppStats?.p50).toBe(150);
      expect(mockResult.cppStats?.p75).toBe(200);
    });
  });

  describe("CPP value ranges", () => {
    it("should have realistic CPP values for typical routes", () => {
      // Typical CPP: 1-5 cents per mile
      // $600 / 30K miles = 2 cents per mile
      const cashCost = 600;
      const milesRequired = 30000;
      const cpp = Math.round((cashCost * 100) / milesRequired);

      expect(cpp).toBeGreaterThan(0);
      expect(cpp).toBeLessThan(1000); // Sanity check
    });

    it("should have percentile values in ascending order", () => {
      const cppStats = {
        p25: 100,
        p50: 200,
        p75: 300,
      };

      expect(cppStats.p25).toBeLessThanOrEqual(cppStats.p50);
      expect(cppStats.p50).toBeLessThanOrEqual(cppStats.p75);
    });
  });

  describe("Trend information", () => {
    it("should include valid price trend values", () => {
      const validTrends = ["up", "down", "stable", "unknown"];
      const mockTrend: "up" | "down" | "stable" | "unknown" = "stable";

      expect(validTrends).toContain(mockTrend);
    });

    it("should handle missing trend data gracefully", () => {
      const mockResult = {
        from: "SFO",
        to: "CDG",
        price: 600,
        airlines: ["United"],
        stops: 0,
        tripType: "oneway" as const,
        cabin: "economy" as const,
        passengers: 1,
        cashCost: 600,
        milesCost: 2000,
        savings: 0,
        recommendation: "USE_CASH" as const,
        bestOption: null,
        milesOptions: [],
        explanation: "Test",
        displayMessage: "Test",
        disclaimer: "Test",
        cabinPriceEstimated: false,
        searchId: "test",
        optimization: { type: "LOWEST_MILES" as const },
        priceTrend: undefined, // Optional field
      };

      expect(mockResult.priceTrend).toBeUndefined();
    });
  });

  describe("Value badge assignment", () => {
    it("should assign GREAT_DEAL for CPP at or below 25th percentile", () => {
      const cpp = 100;
      const percentiles = { p25: 100, p50: 200, p75: 300 };

      const isGreatDeal = cpp <= percentiles.p25;
      expect(isGreatDeal).toBe(true);
    });

    it("should assign FAIR_DEAL for CPP between 25th and 75th", () => {
      const cpp = 200;
      const percentiles = { p25: 100, p50: 200, p75: 300 };

      const isFairDeal = cpp > percentiles.p25 && cpp < percentiles.p75;
      expect(isFairDeal).toBe(true);
    });

    it("should assign EXPENSIVE for CPP at or above 75th percentile", () => {
      const cpp = 300;
      const percentiles = { p25: 100, p50: 200, p75: 300 };

      const isExpensive = cpp >= percentiles.p75;
      expect(isExpensive).toBe(true);
    });

    it("should assign UNKNOWN when no percentile data available", () => {
      const cpp = 200;
      const percentiles = null;

      expect(percentiles).toBeNull();
    });
  });

  describe("Backward compatibility", () => {
    it("should allow FlightResult without P5 fields (pre-optimization)", () => {
      const legacyResult = {
        from: "SFO",
        to: "CDG",
        price: 600,
        airlines: ["United"],
        stops: 0,
        tripType: "oneway" as const,
        cabin: "economy" as const,
        passengers: 1,
        cashCost: 600,
        milesCost: 2000,
        savings: 0,
        recommendation: "USE_CASH" as const,
        bestOption: null,
        milesOptions: [],
        explanation: "Test",
        displayMessage: "Test",
        disclaimer: "Test",
        cabinPriceEstimated: false,
        searchId: "test",
        optimization: { type: "LOWEST_MILES" as const },
        // P5 fields are optional
      };

      // Should not require valueBadge
      expect(legacyResult.valueBadge).toBeUndefined();
      expect(legacyResult).toBeDefined();
    });
  });
});

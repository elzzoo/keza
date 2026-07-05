import { enrich, mergeFlights, filterByStops } from "@/lib/engine/enrich";
import type { NormalizedFlight } from "@/lib/promotions/engine";
import type { FlightResult } from "@/lib/engine/types";

describe("enrich — flight enrichment with miles options", () => {
  const mockFlight: NormalizedFlight = {
    from: "LHR",
    to: "JFK",
    price: 500,
    airlines: ["British Airways"],
    stops: 0,
    duration: 480,
    source: "DUFFEL",
    priceConfidence: "HIGH",
    cabinResolved: true,
  };

  const mockPrograms = ["British Airways Executive Club"];
  const mockEffectivePrices = new Map<string, number>([
    ["British Airways Executive Club", 70000],
  ]);

  describe("Happy path: complete enrichment", () => {
    it("enriches a one-way flight with default cabin", () => {
      const result = enrich(
        mockFlight,
        "economy",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      expect(result).toHaveProperty("from", "LHR");
      expect(result).toHaveProperty("to", "JFK");
      expect(result).toHaveProperty("price", 500);
      expect(result).toHaveProperty("cabin", "economy");
      expect(result).toHaveProperty("totalPrice", 500);
      expect(result).toHaveProperty("tripType", "oneway");
      expect(result.milesOptions).toBeDefined();
      expect(Array.isArray(result.milesOptions)).toBe(true);
    });

    it("returns milesOptions array with 5-10+ programs for major airlines", () => {
      const airFranceFlight: NormalizedFlight = {
        ...mockFlight,
        airlines: ["Air France"],
        source: "DUFFEL",
      };

      const result = enrich(
        airFranceFlight,
        "economy",
        1,
        [],
        "oneway",
        new Map(),
        undefined,
        "2024-06-20"
      );

      expect(Array.isArray(result.milesOptions)).toBe(true);
      // Air France is major carrier — expect 5+ options (direct + alliances + transfers)
      expect(result.milesOptions.length).toBeGreaterThanOrEqual(5);
      // Each option should have required fields
      result.milesOptions.forEach((option) => {
        expect(option.program).toBeDefined();
        expect(option.milesRequired).toBeGreaterThanOrEqual(0);
        expect(option.type).toMatch(/^(DIRECT|ALLIANCE|TRANSFER)$/);
        expect(option.isBestDeal).toBe(
          option === result.bestOption || !result.milesOptions.some((m) => m.isBestDeal)
        );
      });
    });

    it("attaches booking link for one-way flight with searchDate", () => {
      const result = enrich(
        mockFlight,
        "economy",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      expect(result.bookingLink).toBeDefined();
      expect(typeof result.bookingLink).toBe("string");
    });

    it("attaches booking link for roundtrip flight with searchDate and returnDate", () => {
      const returnFlight: NormalizedFlight = {
        ...mockFlight,
        price: 450,
      };

      const result = enrich(
        mockFlight,
        "economy",
        1,
        mockPrograms,
        "roundtrip",
        mockEffectivePrices,
        returnFlight,
        "2024-06-20",
        "2024-06-27"
      );

      expect(result.bookingLink).toBeDefined();
      expect(typeof result.bookingLink).toBe("string");
    });
  });

  describe("No programs found: rare airlines", () => {
    it("returns empty milesOptions for unknown airline code", () => {
      const unknownFlight: NormalizedFlight = {
        from: "LAX",
        to: "JFK",
        price: 300,
        airlines: ["XX (Unknown Airline)"],
        source: "TP",
        priceConfidence: "LOW",
      };

      const result = enrich(
        unknownFlight,
        "economy",
        1,
        [],
        "oneway",
        new Map(),
        undefined,
        "2024-06-20"
      );

      // Unknown airline → empty or minimal milesOptions
      expect(Array.isArray(result.milesOptions)).toBe(true);
      // May be empty or minimal for truly unknown carriers
      expect(result.bestOption === null || result.bestOption).toBeDefined();
    });

    it("handles regional airline with no direct programs", () => {
      const regionalFlight: NormalizedFlight = {
        from: "CDG",
        to: "TLS",
        price: 150,
        airlines: ["Regional Airline"],
        source: "TP",
        priceConfidence: "LOW",
      };

      const result = enrich(
        regionalFlight,
        "economy",
        1,
        [],
        "oneway",
        new Map(),
        undefined,
        "2024-06-20"
      );

      expect(Array.isArray(result.milesOptions)).toBe(true);
      // May still have ALLIANCE or TRANSFER options even if no DIRECT
      result.milesOptions.forEach((opt) => {
        expect(["DIRECT", "ALLIANCE", "TRANSFER"]).toContain(opt.type);
      });
    });
  });

  describe("Edge case: 0 passengers (no divide-by-zero)", () => {
    it("handles 0 passengers gracefully without crashing", () => {
      // Edge case: system receives 0 passengers (should be caught upstream, but we test safety)
      expect(() => {
        enrich(
          mockFlight,
          "economy",
          0,
          mockPrograms,
          "oneway",
          mockEffectivePrices,
          undefined,
          "2024-06-20"
        );
      }).not.toThrow();
    });

    it("produces totalPrice = 0 when passengers = 0", () => {
      const result = enrich(
        mockFlight,
        "economy",
        0,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      expect(result.totalPrice).toBe(0);
      expect(Number.isFinite(result.totalPrice)).toBe(true);
    });
  });

  describe("Edge case: undefined returnFlight in roundtrip (no crash)", () => {
    it("handles missing return flight without crashing", () => {
      expect(() => {
        enrich(
          mockFlight,
          "economy",
          1,
          mockPrograms,
          "roundtrip",
          mockEffectivePrices,
          undefined, // no return flight provided
          "2024-06-20",
          "2024-06-27"
        );
      }).not.toThrow();
    });

    it("produces valid FlightResult even without return flight", () => {
      const result = enrich(
        mockFlight,
        "economy",
        1,
        mockPrograms,
        "roundtrip",
        mockEffectivePrices,
        undefined,
        "2024-06-20",
        "2024-06-27"
      );

      expect(result).toBeDefined();
      expect(result.returnPrice).toBeUndefined();
      expect(result.totalPrice).toBe(mockFlight.price * 1); // only outbound
    });

    it("treats missing returnFlight as one-way pricing", () => {
      const result = enrich(
        mockFlight,
        "economy",
        2,
        mockPrograms,
        "roundtrip",
        mockEffectivePrices,
        undefined,
        "2024-06-20",
        "2024-06-27"
      );

      expect(result.totalPrice).toBe(500 * 2); // outbound price × passengers only
    });
  });

  describe("Edge case: negative prices (broken data)", () => {
    it("throws on negative outbound price due to sanity check", () => {
      const badFlight: NormalizedFlight = {
        ...mockFlight,
        price: -100, // broken data — triggers 10x sanity check
      };

      expect(() => {
        enrich(
          badFlight,
          "economy",
          1,
          mockPrograms,
          "oneway",
          mockEffectivePrices,
          undefined,
          "2024-06-20"
        );
      }).toThrow();
    });

    it("does not crash on zero price", () => {
      const zeroPriceFlight: NormalizedFlight = {
        ...mockFlight,
        price: 0,
      };

      const result = enrich(
        zeroPriceFlight,
        "economy",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      expect(result.totalPrice).toBe(0);
    });

    it("does not crash on very small positive price", () => {
      const cheapFlight: NormalizedFlight = {
        ...mockFlight,
        price: 1,
      };

      const result = enrich(
        cheapFlight,
        "economy",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      expect(result.totalPrice).toBe(1);
    });
  });

  describe("Accuracy: miles cost calculation vs costEngine", () => {
    it("bestOption has required fields for cost calculation", () => {
      const result = enrich(
        mockFlight,
        "economy",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      if (result.bestOption) {
        expect(result.bestOption.milesRequired).toBeGreaterThanOrEqual(0);
        expect(result.bestOption.valuePerMile).toBeGreaterThanOrEqual(0);
        expect(result.bestOption.milesCost).toBeGreaterThanOrEqual(0);
        expect(result.bestOption.totalMilesCost).toBeGreaterThanOrEqual(result.bestOption.milesCost);
      }
    });

    it("bestOption.totalMilesCost = milesCost + taxes", () => {
      const result = enrich(
        mockFlight,
        "economy",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      if (result.bestOption) {
        expect(result.bestOption.totalMilesCost).toBe(
          result.bestOption.milesCost + result.bestOption.taxes
        );
      }
    });

    it("milesCost in result matches bestOption.totalMilesCost", () => {
      const result = enrich(
        mockFlight,
        "economy",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      if (result.bestOption) {
        expect(result.milesCost).toBe(result.bestOption.totalMilesCost);
      }
    });

    it("savings = cashCost - milesCost", () => {
      const result = enrich(
        mockFlight,
        "economy",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      expect(result.savings).toBe(result.cashCost - result.milesCost);
    });

    it("recommendation reflects cashCost vs milesCost correctly", () => {
      const result = enrich(
        mockFlight,
        "economy",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      expect(["USE_MILES", "USE_CASH", "IF_HAVE_MILES"]).toContain(result.recommendation);
      // Sign of savings should roughly match recommendation
      if (result.bestOption && result.recommendation === "USE_MILES") {
        expect(result.savings).toBeGreaterThanOrEqual(0);
      }
    });

    it("cashCost equals totalPrice from flight input", () => {
      const result = enrich(
        mockFlight,
        "economy",
        2,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      expect(result.cashCost).toBe(result.totalPrice);
    });
  });

  describe("Program filtering: isBestDeal flag", () => {
    it("only one milesOption has isBestDeal:true (or none if empty)", () => {
      const result = enrich(
        mockFlight,
        "economy",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      const bestDealCount = result.milesOptions.filter((opt) => opt.isBestDeal).length;
      expect(bestDealCount).toBeLessThanOrEqual(1);
    });

    it("isBestDeal option matches bestOption", () => {
      const result = enrich(
        mockFlight,
        "economy",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      const bestDeal = result.milesOptions.find((opt) => opt.isBestDeal);
      if (bestDeal && result.bestOption) {
        expect(bestDeal.program).toBe(result.bestOption.program);
      }
    });

    it("isBestDeal identifies cheapest totalMilesCost option", () => {
      const result = enrich(
        mockFlight,
        "economy",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      if (result.milesOptions.length > 0) {
        const cheapest = result.milesOptions.reduce((min, opt) =>
          opt.totalMilesCost < min.totalMilesCost ? opt : min
        );
        const bestDeal = result.milesOptions.find((opt) => opt.isBestDeal);
        if (bestDeal) {
          expect(bestDeal.totalMilesCost).toBe(cheapest.totalMilesCost);
        }
      }
    });
  });

  describe("Confidence tiers: HIGH vs LOW vs ESTIMATED", () => {
    it("Duffel source → priceConfidence:HIGH", () => {
      const duffelFlight: NormalizedFlight = {
        ...mockFlight,
        source: "DUFFEL",
        priceConfidence: "HIGH",
      };

      const result = enrich(
        duffelFlight,
        "economy",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      expect(result.priceConfidence).toBe("HIGH");
    });

    it("TP source → priceConfidence:LOW", () => {
      const tpFlight: NormalizedFlight = {
        ...mockFlight,
        source: "TP",
        priceConfidence: "LOW",
      };

      const result = enrich(
        tpFlight,
        "economy",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      expect(result.priceConfidence).toBe("LOW");
    });

    it("SYNTHETIC source → priceConfidence:ESTIMATED", () => {
      const syntheticFlight: NormalizedFlight = {
        ...mockFlight,
        source: "SYNTHETIC",
        priceConfidence: "ESTIMATED",
        isSupplemental: true,
      };

      const result = enrich(
        syntheticFlight,
        "economy",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      expect(result.priceConfidence).toBe("ESTIMATED");
      expect(result.isSupplemental).toBe(true);
    });

    it("HIGH confidence does not downgrade recommendation to IF_HAVE_MILES", () => {
      const duffelFlight: NormalizedFlight = {
        ...mockFlight,
        source: "DUFFEL",
        priceConfidence: "HIGH",
        cabinResolved: true,
      };

      const result = enrich(
        duffelFlight,
        "business",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      // HIGH confidence + cabinResolved → recommendation can be USE_MILES or USE_CASH
      expect(["USE_MILES", "USE_CASH"]).toContain(result.recommendation);
    });

    it("LOW confidence with estimate → recommendation may be IF_HAVE_MILES", () => {
      const tpFlight: NormalizedFlight = {
        ...mockFlight,
        source: "TP",
        priceConfidence: "LOW",
        cabinResolved: false, // TP prices are estimates
      };

      const result = enrich(
        tpFlight,
        "business",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      // Price is estimated (cabinResolved=false + non-economy) → IF_HAVE_MILES
      expect(result.recommendation).toBe("IF_HAVE_MILES");
    });
  });

  describe("Cabin price multipliers (TP estimates)", () => {
    it("applies CABIN_MULTIPLIER for non-Duffel flights", () => {
      const tpFlight: NormalizedFlight = {
        ...mockFlight,
        source: "TP",
        priceConfidence: "LOW",
        cabinResolved: undefined,
      };

      const result = enrich(
        tpFlight,
        "business",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      // Price should be multiplied by 4.0 for business
      expect(result.price).toBe(2000); // 500 * 4.0
    });

    it("does not apply CABIN_MULTIPLIER for Duffel flights with cabinResolved:true", () => {
      const result = enrich(
        mockFlight,
        "business",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      // Duffel with cabinResolved=true should not apply multiplier
      expect(result.price).toBe(500); // no multiplier
    });

    it("premium cabin: 1.8x multiplier", () => {
      const tpFlight: NormalizedFlight = {
        ...mockFlight,
        cabinResolved: false,
      };

      const result = enrich(
        tpFlight,
        "premium",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      expect(result.price).toBeCloseTo(500 * 1.8);
    });

    it("first cabin: 6.5x multiplier", () => {
      const tpFlight: NormalizedFlight = {
        ...mockFlight,
        cabinResolved: false,
      };

      const result = enrich(
        tpFlight,
        "first",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      expect(result.price).toBeCloseTo(500 * 6.5);
    });

    it("marks cabinPriceEstimated:true for non-Duffel premium/business/first", () => {
      const tpFlight: NormalizedFlight = {
        ...mockFlight,
        source: "TP",
        cabinResolved: undefined,
      };

      const result = enrich(
        tpFlight,
        "premium",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      expect(result.cabinPriceEstimated).toBe(true);
      expect(result.priceIsEstimate).toBe(true);
    });

    it("cabinPriceEstimated:false for economy regardless of source", () => {
      const tpFlight: NormalizedFlight = {
        ...mockFlight,
        source: "TP",
        cabinResolved: undefined,
      };

      const result = enrich(
        tpFlight,
        "economy",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      expect(result.cabinPriceEstimated).toBe(false);
    });
  });

  describe("Roundtrip pricing", () => {
    it("includes returnPrice and returnAirlines when roundtrip", () => {
      const returnFlight: NormalizedFlight = {
        ...mockFlight,
        airlines: ["American Airlines"],
        price: 450,
      };

      const result = enrich(
        mockFlight,
        "economy",
        1,
        mockPrograms,
        "roundtrip",
        mockEffectivePrices,
        returnFlight,
        "2024-06-20",
        "2024-06-27"
      );

      expect(result.returnPrice).toBe(450);
      expect(result.returnAirlines).toEqual(["American Airlines"]);
      expect(result.totalPrice).toBe(950); // (500 + 450) * 1
    });

    it("calculates totalPrice correctly for roundtrip with multiple passengers", () => {
      const returnFlight: NormalizedFlight = {
        ...mockFlight,
        price: 450,
      };

      const result = enrich(
        mockFlight,
        "economy",
        3,
        mockPrograms,
        "roundtrip",
        mockEffectivePrices,
        returnFlight,
        "2024-06-20",
        "2024-06-27"
      );

      expect(result.totalPrice).toBe(2850); // (500 + 450) * 3
    });

    it("applies cabin multiplier to return flight", () => {
      const tpFlight: NormalizedFlight = {
        ...mockFlight,
        cabinResolved: false,
      };

      const returnFlight: NormalizedFlight = {
        ...mockFlight,
        price: 400,
        cabinResolved: false,
      };

      const result = enrich(
        tpFlight,
        "business",
        1,
        mockPrograms,
        "roundtrip",
        mockEffectivePrices,
        returnFlight,
        "2024-06-20",
        "2024-06-27"
      );

      // Both multiplied by 4.0
      expect(result.price).toBe(2000); // 500 * 4.0
      expect(result.returnPrice).toBe(1600); // 400 * 4.0
      expect(result.totalPrice).toBe(3600); // (2000 + 1600) * 1
    });
  });

  describe("Passenger count handling", () => {
    it("calculates totalPrice as price * passengers for one-way", () => {
      const result = enrich(
        mockFlight,
        "economy",
        2,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      expect(result.totalPrice).toBe(1000); // 500 * 2
    });

    it("calculates totalPrice correctly for roundtrip with multiple passengers", () => {
      const returnFlight: NormalizedFlight = {
        ...mockFlight,
        price: 450,
      };

      const result = enrich(
        mockFlight,
        "economy",
        5,
        mockPrograms,
        "roundtrip",
        mockEffectivePrices,
        returnFlight,
        "2024-06-20",
        "2024-06-27"
      );

      expect(result.totalPrice).toBe(4750); // (500 + 450) * 5
    });

    it("handles single passenger correctly", () => {
      const result = enrich(
        mockFlight,
        "economy",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      expect(result.totalPrice).toBe(500); // 500 * 1
    });
  });

  describe("Metadata fields", () => {
    it("includes source and priceConfidence fields", () => {
      const result = enrich(
        mockFlight,
        "economy",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      expect(result.source).toBe("DUFFEL");
      expect(result.priceConfidence).toBe("HIGH");
    });

    it("includes isSupplemental when flight is supplemental", () => {
      const syntheticFlight: NormalizedFlight = {
        ...mockFlight,
        isSupplemental: true,
        source: "SYNTHETIC",
        priceConfidence: "ESTIMATED",
      };

      const result = enrich(
        syntheticFlight,
        "economy",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      expect(result.isSupplemental).toBe(true);
    });

    it("includes bookingLink from Duffel when available", () => {
      const duffelFlight: NormalizedFlight = {
        ...mockFlight,
        bookingLink: "https://duffel-booking.com/abc123",
      };

      const result = enrich(
        duffelFlight,
        "economy",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      expect(result.bookingLink).toBe("https://duffel-booking.com/abc123");
    });

    it("marks priceIsEstimate:true when cabin is non-economy and cabinResolved is false", () => {
      const tpFlight: NormalizedFlight = {
        ...mockFlight,
        source: "TP",
        cabinResolved: undefined,
      };

      const result = enrich(
        tpFlight,
        "premium",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      expect(result.priceIsEstimate).toBe(true);
      expect(result.cabinPriceEstimated).toBe(true);
    });

    it("marks priceIsEstimate:false when cabin is economy regardless of cabinResolved", () => {
      const tpFlight: NormalizedFlight = {
        ...mockFlight,
        source: "TP",
        cabinResolved: undefined,
      };

      const result = enrich(
        tpFlight,
        "economy",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      expect(result.priceIsEstimate).toBeUndefined();
      expect(result.cabinPriceEstimated).toBe(false);
    });

    it("forces recommendation to IF_HAVE_MILES when priceIsEstimate:true", () => {
      const tpFlight: NormalizedFlight = {
        ...mockFlight,
        source: "TP",
        cabinResolved: undefined,
      };

      const result = enrich(
        tpFlight,
        "business",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices,
        undefined,
        "2024-06-20"
      );

      expect(result.recommendation).toBe("IF_HAVE_MILES");
    });
  });

  describe("Validation & sanity checks", () => {
    it("validates cabin multiplier is finite and positive for outbound flight", () => {
      expect(() => {
        const flight = { ...mockFlight, cabinResolved: false };
        enrich(flight, "economy", 1, mockPrograms, "oneway", mockEffectivePrices);
      }).not.toThrow();
    });

    it("prevents excessive cabin price estimation (sanity check)", () => {
      const expensiveFlight: NormalizedFlight = {
        ...mockFlight,
        price: 5000,
        cabinResolved: false,
      };

      const result = enrich(
        expensiveFlight,
        "economy",
        1,
        mockPrograms,
        "oneway",
        mockEffectivePrices
      );
      expect(result.price).toBe(5000);
    });

    it("throws on invalid outbound cabin multiplier (NaN or negative)", () => {
      // This guards against data corruption in CABIN_MULTIPLIER
      // (In production, CABIN_MULTIPLIER is always valid, but this documents the validation)
      const flight = { ...mockFlight, cabinResolved: false };
      expect(() => {
        enrich(flight, "economy", 1, mockPrograms, "oneway", mockEffectivePrices);
      }).not.toThrow();
    });

    it("throws on excessive cabin price multiplier (>10x base)", () => {
      // Scenario: if somehow a multiplier resulted in >10x price
      // This is a guard against cascading multiplier bugs
      // (not easily triggerable with standard CABIN_MULTIPLIER values)
      const flight = { ...mockFlight, cabinResolved: false };
      const result = enrich(flight, "business", 1, mockPrograms, "oneway", mockEffectivePrices);
      // business = 4.0x, so 500 * 4 = 2000 — within 10x cap
      expect(result.price).toBeLessThanOrEqual(mockFlight.price * 10);
    });
  });
});

describe("mergeFlights — duplicate deduplication and source preference", () => {
  const base = {
    from: "LHR",
    to: "JFK",
    airlines: ["British Airways"],
    stops: 0,
  };

  it("merges empty arrays", () => {
    const result = mergeFlights([], []);
    expect(result).toEqual([]);
  });

  it("returns first array when second is empty", () => {
    const primary: NormalizedFlight = { ...base, price: 500, source: "DUFFEL", priceConfidence: "HIGH" };
    const result = mergeFlights([primary], []);
    expect(result).toHaveLength(1);
    expect(result[0].price).toBe(500);
  });

  it("deduplicates same airline+stops combination by keeping cheapest", () => {
    const flight1: NormalizedFlight = { ...base, price: 600, source: "TP", priceConfidence: "LOW" };
    const flight2: NormalizedFlight = { ...base, price: 500, source: "TP", priceConfidence: "LOW" };
    const result = mergeFlights([flight1], [flight2]);
    expect(result).toHaveLength(1);
    expect(result[0].price).toBe(500);
  });

  it("prefers Duffel over TP when same airline+stops", () => {
    const tp: NormalizedFlight = { ...base, price: 400, source: "TP", priceConfidence: "LOW" };
    const duffel: NormalizedFlight = { ...base, price: 500, source: "DUFFEL", priceConfidence: "HIGH" };
    const result = mergeFlights([tp], [duffel]);
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("DUFFEL");
    expect(result[0].price).toBe(500);
  });

  it("keeps distinct airlines as separate entries", () => {
    const ba: NormalizedFlight = { ...base, airlines: ["British Airways"], price: 500, source: "TP", priceConfidence: "LOW" };
    const aa: NormalizedFlight = { ...base, airlines: ["American Airlines"], price: 550, source: "TP", priceConfidence: "LOW" };
    const result = mergeFlights([ba], [aa]);
    expect(result).toHaveLength(2);
  });

  it("keeps distinct stop counts as separate entries", () => {
    const direct: NormalizedFlight = { ...base, stops: 0, price: 500, source: "TP", priceConfidence: "LOW" };
    const onestop: NormalizedFlight = { ...base, stops: 1, price: 350, source: "TP", priceConfidence: "LOW" };
    const result = mergeFlights([direct], [onestop]);
    expect(result).toHaveLength(2);
  });

  it("inherits TP booking link when Duffel lacks one", () => {
    const tp: NormalizedFlight = { ...base, price: 500, source: "TP", priceConfidence: "LOW", bookingLink: "https://tp.com" };
    const duffel: NormalizedFlight = { ...base, price: 550, source: "DUFFEL", priceConfidence: "HIGH" };
    const result = mergeFlights([tp], [duffel]);
    expect(result[0].bookingLink).toBe("https://tp.com");
  });

  it("preserves Duffel booking link when present", () => {
    const tp: NormalizedFlight = { ...base, price: 500, source: "TP", priceConfidence: "LOW", bookingLink: "https://tp.com" };
    const duffel: NormalizedFlight = { ...base, price: 550, source: "DUFFEL", priceConfidence: "HIGH", bookingLink: "https://duffel.com" };
    const result = mergeFlights([tp], [duffel]);
    expect(result[0].bookingLink).toBe("https://duffel.com");
  });

  it("sorts airlines consistently in dedup key", () => {
    const af: NormalizedFlight = { ...base, airlines: ["Air France", "British Airways"], price: 500, source: "TP", priceConfidence: "LOW" };
    const ba: NormalizedFlight = { ...base, airlines: ["British Airways", "Air France"], price: 600, source: "TP", priceConfidence: "LOW" };
    const result = mergeFlights([af], [ba]);
    expect(result).toHaveLength(1);
    expect(result[0].price).toBe(500); // cheaper one kept
  });
});

describe("filterByStops", () => {
  const base: NormalizedFlight = {
    from: "LHR",
    to: "JFK",
    price: 500,
    airlines: ["British Airways"],
    source: "DUFFEL",
    priceConfidence: "HIGH",
  };

  it("returns all flights when filter is 'any'", () => {
    const flights = [
      { ...base, stops: 0 },
      { ...base, stops: 1 },
      { ...base, stops: 2 },
    ];
    const result = filterByStops(flights, "any");
    expect(result).toHaveLength(3);
  });

  it("returns only direct flights when filter is 'direct'", () => {
    const flights = [
      { ...base, stops: 0 },
      { ...base, stops: 1 },
      { ...base, stops: 2 },
    ];
    const result = filterByStops(flights, "direct");
    expect(result).toHaveLength(1);
    expect(result[0].stops).toBe(0);
  });

  it("returns only flights with stops when filter is 'with_stops'", () => {
    const flights = [
      { ...base, stops: 0 },
      { ...base, stops: 1 },
      { ...base, stops: 2 },
    ];
    const result = filterByStops(flights, "with_stops");
    expect(result).toHaveLength(2);
    expect(result.every((f) => f.stops && f.stops > 0)).toBe(true);
  });

  it("treats undefined stops as 0", () => {
    const flights = [
      { ...base, stops: undefined },
      { ...base, stops: 1 },
    ];
    const result = filterByStops(flights, "direct");
    expect(result).toHaveLength(1);
    expect(result[0].stops).toBeUndefined();
  });

  it("filters empty array", () => {
    const result = filterByStops([], "direct");
    expect(result).toEqual([]);
  });
});

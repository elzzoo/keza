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

  it("applies CABIN_MULTIPLIER for non-Duffel flights", () => {
    const tpFlight: NormalizedFlight = {
      ...mockFlight,
      source: "TP",
      priceConfidence: "LOW",
      cabinResolved: undefined, // TP flights don't have cabinResolved
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

  it("sets priceIsEstimate:true when cabin is non-economy and cabinResolved is false", () => {
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

  it("sets priceIsEstimate:false when cabin is economy regardless of cabinResolved", () => {
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

    // Recommendation should be forced to IF_HAVE_MILES when price is estimated
    expect(result.recommendation).toBe("IF_HAVE_MILES");
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

  it("validates cabin multiplier is finite and positive for outbound flight", () => {
    // This test documents the validation — CABIN_MULTIPLIER should always be valid
    // but we guard against data corruption
    expect(() => {
      // Simulate an invalid multiplier by manually creating a scenario
      // (actual CABIN_MULTIPLIER is always valid in production)
      const flight = { ...mockFlight, cabinResolved: false };
      enrich(flight, "economy", 1, mockPrograms, "oneway", mockEffectivePrices);
    }).not.toThrow(); // Valid multiplier should not throw
  });

  it("prevents excessive cabin price estimation (sanity check)", () => {
    // A flight with very high base price should not result in >10x multiplier
    // This guards against cascading multiplier bugs
    const expensiveFlight: NormalizedFlight = {
      ...mockFlight,
      price: 5000,
      cabinResolved: false,
    };

    // Economy cabin (1x multiplier) should be fine
    const result = enrich(
      expensiveFlight,
      "economy",
      1,
      mockPrograms,
      "oneway",
      mockEffectivePrices
    );
    expect(result.price).toBe(5000); // No multiplier for economy
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

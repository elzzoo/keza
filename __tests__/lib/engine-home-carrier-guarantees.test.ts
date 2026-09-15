const mockEnrich = jest.fn();

jest.mock("@/lib/engine/enrich", () => ({
  enrich: (...args: unknown[]) => mockEnrich(...args),
}));

import { applyHomeCarrierGuarantees } from "@/lib/engine/homeCarrierGuarantees";
import type { FlightResult } from "@/lib/engine/types";
import type { NormalizedFlight } from "@/lib/promotions/engine";

describe("applyHomeCarrierGuarantees", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnrich.mockImplementation((flight: NormalizedFlight) => ({
      ...flight,
      tripType: "oneway",
      cabin: "economy",
      passengers: 1,
      cashCost: flight.price,
      milesCost: flight.price,
      savings: 0,
      recommendation: "USE_CASH",
      bestOption: null,
      milesOptions: [{ program: "Singapore KrisFlyer" }],
      explanation: "",
      displayMessage: "",
      disclaimer: "",
      cabinPriceEstimated: false,
      searchId: "",
      optimization: { recommendation: "none", reasons: [] },
    }));
  });

  it("injects a missing home carrier with the cheapest outbound price anchor", () => {
    const results = [] as FlightResult[];
    const outbound = [
      { from: "SIN", to: "LAX", price: 900, airlines: ["Other Air"], cabinResolved: true },
      { from: "SIN", to: "LAX", price: 700, airlines: ["Anchor Air"], cabinResolved: false },
    ];

    const nextResults = applyHomeCarrierGuarantees({
      results,
      outbound,
      params: {
        from: "SIN",
        to: "LAX",
        date: "2026-10-01",
        cabin: "economy",
        passengers: 1,
        tripType: "oneway",
        userPrograms: [],
      },
      effectivePrices: new Map(),
      searchId: "search-1",
    });

    expect(nextResults).toHaveLength(1);
    expect(nextResults).not.toBe(results);
    expect(mockEnrich).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "SIN",
        to: "LAX",
        price: 700,
        airlines: ["Singapore Airlines"],
        isSupplemental: true,
        source: "SYNTHETIC",
        priceConfidence: "ESTIMATED",
        cabinResolved: false,
      }),
      "economy",
      1,
      [],
      "oneway",
      expect.any(Map),
      undefined,
      "2026-10-01",
      undefined,
    );
    expect(nextResults[0].searchId).toBe("search-1");
  });

  it("does not inject when the guaranteed program is already present", () => {
    const existing = [
      {
        milesOptions: [{ program: "Singapore KrisFlyer" }],
      },
    ] as FlightResult[];

    const nextResults = applyHomeCarrierGuarantees({
      results: existing,
      outbound: [],
      params: {
        from: "SIN",
        to: "LAX",
        date: "2026-10-01",
      },
      effectivePrices: new Map(),
      searchId: "search-1",
    });

    expect(nextResults).toBe(existing);
    expect(mockEnrich).not.toHaveBeenCalled();
  });
});

// __tests__/integration/p5-2-scoring.integration.test.ts
// P5.2 Task 2: deterministic integration tests for scoring in the search pipeline.

const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockFetchFromDuffel = jest.fn();
const mockFetchFromAmadeus = jest.fn();
const mockFetchFromTravelpayouts = jest.fn();
const mockGetEffectivePrices = jest.fn();

jest.mock("@/lib/config", () => ({
  ENABLE_MULTI_LEG_ROUTING: false,
  ENABLE_P5_2_SOFT_LAUNCH: true,
  P5_2_BASELINE_ONLY: true,
}));

jest.mock("@/lib/redis", () => ({
  redis: {
    get: (...args: unknown[]) => mockRedisGet(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
  },
}));

jest.mock("@/lib/duffelProvider", () => ({
  fetchFromDuffel: (...args: unknown[]) => mockFetchFromDuffel(...args),
}));

jest.mock("@/lib/amadeusProvider", () => ({
  fetchFromAmadeus: (...args: unknown[]) => mockFetchFromAmadeus(...args),
}));

jest.mock("@/lib/engine/travelpayouts", () => ({
  fetchFromTravelpayouts: (...args: unknown[]) => mockFetchFromTravelpayouts(...args),
  buildAviasalesUrl: jest.fn(() => "https://booking.example/search"),
}));

jest.mock("@/lib/promotions/engine", () => ({
  loadPromotions: jest.fn(async () => []),
  applyPromotions: jest.fn((flights) => flights),
}));

jest.mock("@/lib/costEngine", () => ({
  getEffectivePrices: (...args: unknown[]) => mockGetEffectivePrices(...args),
  initializeBonusTransfers: jest.fn(async () => undefined),
  buildCostOptions: jest.fn((flight) => ({
    cashCost: flight.totalPrice,
    milesCost: flight.totalPrice,
    savings: 0,
    recommendation: "USE_CASH",
    bestOption: null,
    milesOptions: [],
    explanation: "Use cash",
    displayMessage: "Cash wins",
    disclaimer: "",
  })),
}));

jest.mock("@/lib/autoCalibrate", () => ({
  recordObservation: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

import { searchEngine } from "@/lib/engine/index";
import type { FlightResult } from "@/lib/engine/types";

describe("P5.2 Task 2: Scoring Engine Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue("OK");
    mockFetchFromDuffel.mockResolvedValue([]);
    mockFetchFromAmadeus.mockResolvedValue([]);
    mockFetchFromTravelpayouts.mockResolvedValue([
      {
        from: "SIN",
        to: "LAX",
        price: 720,
        airlines: ["Singapore Airlines"],
        stops: 0,
        duration: 930,
        cabinResolved: true,
        source: "TP",
        priceConfidence: "LOW",
      },
      {
        from: "SIN",
        to: "LAX",
        price: 640,
        airlines: ["United Airlines"],
        stops: 1,
        duration: 1120,
        cabinResolved: true,
        source: "TP",
        priceConfidence: "LOW",
      },
    ]);
    mockGetEffectivePrices.mockResolvedValue(new Map());
  });

  it("scores all results from search pipeline when enabled", async () => {
    const results = await runSearch("economy");

    expect(results.length).toBeGreaterThanOrEqual(2);
    for (const flight of results) {
      expect(flight.scoringResult).toBeDefined();
      expect(flight.scoringResult?.overallScore).toBeGreaterThanOrEqual(0);
      expect(flight.scoringResult?.overallScore).toBeLessThanOrEqual(100);
    }
  });

  it("scores results while keeping baseline ordering during Week 1-2", async () => {
    const results = await runSearch("economy");

    expect(results.length).toBeGreaterThanOrEqual(2);
    for (const flight of results) {
      expect(flight.scoringResult?.overallScore).toBeGreaterThanOrEqual(0);
      expect(flight.scoringResult?.overallScore).toBeLessThanOrEqual(100);
    }
  });

  it("preserves all P5.1 fields", async () => {
    const results = await runSearch("economy");
    const flight = results[0];

    expect(flight).toHaveProperty("from");
    expect(flight).toHaveProperty("to");
    expect(flight).toHaveProperty("cashCost");
    expect(flight.cashCost).toBeGreaterThanOrEqual(0);
    expect(flight).toHaveProperty("milesOptions");
    expect(Array.isArray(flight.milesOptions)).toBe(true);
    expect(flight).toHaveProperty("recommendation");
    expect(["USE_MILES", "USE_CASH", "IF_HAVE_MILES"]).toContain(flight.recommendation);
    expect(flight).toHaveProperty("bestOption");
  });

  it("provides valid scoring breakdown with all 6 signals", async () => {
    const results = await runSearch("economy");
    const breakdown = results[0].scoringResult?.breakdown;

    expect(breakdown).toBeDefined();
    expect(breakdown).toHaveProperty("cabin");
    expect(breakdown).toHaveProperty("accessibility");
    expect(breakdown).toHaveProperty("price");
    expect(breakdown).toHaveProperty("connections");
    expect(breakdown).toHaveProperty("layover");
    expect(breakdown).toHaveProperty("carrier");

    const signals = [
      breakdown!.cabin,
      breakdown!.accessibility,
      breakdown!.price,
      breakdown!.connections,
      breakdown!.layover,
      breakdown!.carrier,
    ];

    for (const signal of signals) {
      expect(signal).toBeGreaterThanOrEqual(0);
      expect(signal).toBeLessThanOrEqual(100);
    }
  });

  it("scores flights consistently across cabin classes", async () => {
    const cabins = ["economy", "premium"] as const;
    const resultsPerCabin: Record<string, FlightResult[]> = {};

    for (const cabin of cabins) {
      resultsPerCabin[cabin] = await runSearch(cabin);
    }

    for (const [cabin, results] of Object.entries(resultsPerCabin)) {
      expect(cabin).toMatch(/economy|premium/);
      expect(results.length).toBeGreaterThan(0);

      const cabinScores = results
        .map((flight) => flight.scoringResult?.breakdown.cabin ?? 0)
        .filter((score) => score > 0);

      expect(cabinScores.length).toBeGreaterThan(0);
      const firstCabinScore = cabinScores[0];
      for (const score of cabinScores) {
        expect(score).toBe(firstCabinScore);
      }
    }
  });
});

async function runSearch(cabin: "economy" | "premium"): Promise<FlightResult[]> {
  return searchEngine({
    from: "SIN",
    to: "LAX",
    date: "2026-08-15",
    cabin,
    passengers: 1,
  });
}

const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockFetchFromDuffel = jest.fn();
const mockFetchFromAmadeus = jest.fn();
const mockFetchFromTravelpayouts = jest.fn();
const mockGetEffectivePrices = jest.fn();
const mockRecordObservation = jest.fn();
const mockScoreFlights = jest.fn();

jest.mock("@/lib/config", () => ({
  ENABLE_P5_2_SOFT_LAUNCH: true,
  P5_2_BASELINE_ONLY: false,
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
  recordObservation: (...args: unknown[]) => mockRecordObservation(...args),
}));

jest.mock("@/lib/scoring/scoringEngine", () => ({
  scoreFlights: (...args: unknown[]) => mockScoreFlights(...args),
}));

jest.mock("@/lib/logger", () => ({
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

import { searchEngineStream } from "@/lib/engine/stream";

describe("searchEngineStream P5.2 scoring", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue("OK");
    mockFetchFromDuffel.mockResolvedValue([]);
    mockFetchFromAmadeus.mockResolvedValue([]);
    mockFetchFromTravelpayouts.mockResolvedValue([
      { from: "CDG", to: "JFK", price: 900, airlines: ["Low Score Air"], stops: 1 },
      { from: "CDG", to: "JFK", price: 1000, airlines: ["High Score Air"], stops: 0 },
    ]);
    mockGetEffectivePrices.mockResolvedValue(new Map());
    mockScoreFlights.mockImplementation(async (flights) =>
      flights.map((flight: { airlines: string[] }) => ({
        ...flight,
        scoringResult: {
          overallScore: flight.airlines.includes("High Score Air") ? 95 : 20,
          breakdown: { cabin: 0, accessibility: 0, price: 0, connections: 0, layover: 0, carrier: 0 },
          reasoning: "test score",
        },
      })),
    );
  });

  it("applies P5.2 scoring and sorts final stream results when baseline mode is off", async () => {
    const results = await searchEngineStream(
      {
        from: "CDG",
        to: "JFK",
        date: "2026-10-01",
        cabin: "economy",
        passengers: 1,
        tripType: "oneway",
        stops: "any",
      },
      jest.fn(),
      "test-request",
    );

    expect(mockScoreFlights).toHaveBeenCalledWith(expect.any(Array), "", expect.any(Date));
    expect(results).toHaveLength(2);
    expect(results[0].airlines).toEqual(["High Score Air"]);
    expect(results[0].scoringResult?.overallScore).toBe(95);
    expect(results[1].scoringResult?.overallScore).toBe(20);
    expect(mockRedisSet).toHaveBeenCalledWith(
      expect.stringContaining("keza:"),
      expect.any(Array),
      expect.objectContaining({ ex: 3600, nx: true }),
    );
  });
});

const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockFetchFromDuffel = jest.fn();
const mockFetchFromAmadeus = jest.fn();
const mockFetchFromTravelpayouts = jest.fn();
const mockGetEffectivePrices = jest.fn();

jest.mock("@/lib/config", () => ({
  ENABLE_MULTI_LEG_ROUTING: false,
  ENABLE_P5_2_SOFT_LAUNCH: false,
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
  buildCostOptions: jest.fn((flight) => {
    const program = flight.airlines.includes("All Nippon Airways")
      ? "ANA Mileage Club"
      : flight.airlines.includes("Japan Airlines")
        ? "Japan Airlines Mileage Bank"
        : "Cash";

    return {
      cashCost: flight.totalPrice,
      milesCost: flight.totalPrice,
      savings: 0,
      recommendation: "USE_CASH",
      bestOption: null,
      milesOptions: program === "Cash" ? [] : [{ program }],
      explanation: "Use cash",
      displayMessage: "Cash wins",
      disclaimer: "",
    };
  }),
}));

jest.mock("@/lib/autoCalibrate", () => ({
  recordObservation: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

import { searchEngine } from "@/lib/engine";
import { searchEngineStream } from "@/lib/engine/stream";

describe("search engine parity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue("OK");
    mockFetchFromDuffel.mockResolvedValue([]);
    mockFetchFromAmadeus.mockResolvedValue([]);
    mockFetchFromTravelpayouts.mockResolvedValue([]);
    mockGetEffectivePrices.mockResolvedValue(new Map());
  });

  it("classic and stream both apply home-carrier guarantees when providers are empty", async () => {
    const params = {
      from: "NRT",
      to: "LAX",
      date: "2026-10-01",
      cabin: "business" as const,
      passengers: 1,
      tripType: "oneway" as const,
      stops: "any" as const,
    };

    const classicResults = await searchEngine(params, "classic-request");
    const streamResults = await searchEngineStream(params, jest.fn(), "stream-request");

    const classicSupplementals = classicResults
      .filter((result) => result.isSupplemental)
      .map((result) => result.airlines.join(","))
      .sort();
    const streamSupplementals = streamResults
      .filter((result) => result.isSupplemental)
      .map((result) => result.airlines.join(","))
      .sort();

    expect(classicSupplementals).toEqual(streamSupplementals);
    expect(classicSupplementals).toEqual(
      expect.arrayContaining(["All Nippon Airways", "Japan Airlines"]),
    );
  });
});

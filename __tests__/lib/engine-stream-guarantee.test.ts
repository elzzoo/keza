const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockFetchFromDuffel = jest.fn();
const mockFetchFromAmadeus = jest.fn();
const mockFetchFromTravelpayouts = jest.fn();
const mockGetEffectivePrices = jest.fn();
const mockRecordObservation = jest.fn();

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
  buildCostOptions: jest.fn(() => ({
    cashCost: 2800,
    milesCost: 750,
    savings: 2050,
    recommendation: "USE_MILES",
    bestOption: {
      program: "ANA Mileage Club",
      milesRequired: 45000,
      taxes: 120,
      milesValue: 630,
      totalCost: 750,
      savings: 2050,
      recommendation: "USE_MILES",
      transferPartners: [],
    },
    milesOptions: [
      {
        program: "ANA Mileage Club",
        milesRequired: 45000,
        taxes: 120,
        milesValue: 630,
        totalCost: 750,
        savings: 2050,
        recommendation: "USE_MILES",
        transferPartners: [],
      },
    ],
    explanation: "Use miles",
    displayMessage: "Miles win",
    disclaimer: "",
  })),
}));

jest.mock("@/lib/autoCalibrate", () => ({
  recordObservation: (...args: unknown[]) => mockRecordObservation(...args),
}));

jest.mock("@/lib/logger", () => ({
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

import { searchEngineStream } from "@/lib/engine/stream";

describe("searchEngineStream home carrier guarantee", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue("OK");
    mockFetchFromDuffel.mockResolvedValue([]);
    mockFetchFromAmadeus.mockResolvedValue([]);
    mockFetchFromTravelpayouts.mockResolvedValue([]);
    mockGetEffectivePrices.mockResolvedValue(new Map());
  });

  it("injects guaranteed home-carrier programs even when every provider is empty", async () => {
    const partial = jest.fn();

    const results = await searchEngineStream(
      {
        from: "NRT",
        to: "LAX",
        date: "2026-10-01",
        cabin: "business",
        passengers: 1,
        tripType: "oneway",
        stops: "any",
      },
      partial,
      "test-request",
    );

    expect(partial).not.toHaveBeenCalled();
    expect(results.length).toBeGreaterThan(0);
    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          airlines: ["All Nippon Airways"],
          isSupplemental: true,
          priceConfidence: "ESTIMATED",
        }),
        expect.objectContaining({
          airlines: ["Japan Airlines"],
          isSupplemental: true,
          priceConfidence: "ESTIMATED",
        }),
      ]),
    );
    expect(results.flatMap((result) => (result.milesOptions ?? []).map((option) => option.program))).toContain("ANA Mileage Club");
  });
});

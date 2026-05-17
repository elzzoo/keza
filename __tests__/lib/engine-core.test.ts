// __tests__/lib/engine-core.test.ts
// Tests for CABIN_MULTIPLIER constants and fetchCalendarPrices caching logic

const mockFetch = jest.fn();
global.fetch = mockFetch as typeof global.fetch;

const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: {
    get: (...args: unknown[]) => mockRedisGet(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
  },
}));

jest.mock("@/lib/duffelProvider", () => ({
  fetchFromDuffel: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/lib/logger", () => ({
  logError: jest.fn(),
}));

import { CABIN_MULTIPLIER, fetchCalendarPrices } from "@/lib/engine";

beforeEach(() => {
  jest.clearAllMocks();
  mockRedisGet.mockResolvedValue(null);
  mockRedisSet.mockResolvedValue("OK");
  mockFetch.mockResolvedValue({ ok: false } as Response);
});

// ─── CABIN_MULTIPLIER ─────────────────────────────────────────────────────────

describe("CABIN_MULTIPLIER", () => {
  it("economy multiplier is 1.0", () => {
    expect(CABIN_MULTIPLIER.economy).toBe(1.0);
  });

  it("premium multiplier is 1.8", () => {
    expect(CABIN_MULTIPLIER.premium).toBe(1.8);
  });

  it("business multiplier is 4.0", () => {
    expect(CABIN_MULTIPLIER.business).toBe(4.0);
  });

  it("first class multiplier is 6.5", () => {
    expect(CABIN_MULTIPLIER.first).toBe(6.5);
  });

  it("multipliers are in ascending order economy < premium < business < first", () => {
    expect(CABIN_MULTIPLIER.economy)
      .toBeLessThan(CABIN_MULTIPLIER.premium);
    expect(CABIN_MULTIPLIER.premium)
      .toBeLessThan(CABIN_MULTIPLIER.business);
    expect(CABIN_MULTIPLIER.business)
      .toBeLessThan(CABIN_MULTIPLIER.first);
  });
});

// ─── fetchCalendarPrices ──────────────────────────────────────────────────────

describe("fetchCalendarPrices", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it("returns empty array when TRAVELPAYOUTS_TOKEN is not configured", async () => {
    delete process.env.TRAVELPAYOUTS_TOKEN;

    const result = await fetchCalendarPrices("CDG", "NRT", "2026-06");

    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns empty array when token is placeholder xxx", async () => {
    process.env.TRAVELPAYOUTS_TOKEN = "xxx";

    const result = await fetchCalendarPrices("CDG", "NRT", "2026-06");

    expect(result).toEqual([]);
  });

  it("calls the API when a valid token is set and returns parsed days", async () => {
    process.env.TRAVELPAYOUTS_TOKEN = "real-token";
    // v3 API returns an array under "data" with departure_at field
    const mockData = {
      data: [
        { price: 350, transfers: 0, departure_at: "2026-06-01T10:00:00Z", duration: 360 },
        { price: 420, transfers: 1, departure_at: "2026-06-05T14:00:00Z", duration: 480 },
      ],
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const result = await fetchCalendarPrices("CDG", "NRT", "2026-06");

    expect(mockFetch).toHaveBeenCalled();
    // API was called; returned days should have dates and prices
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("date");
    expect(result[0]).toHaveProperty("price");
  });
});

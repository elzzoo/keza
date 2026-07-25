// __tests__/lib/amadeusProvider.test.ts
// Tests for lib/amadeusProvider.ts — OAuth2 token caching and offer parsing

const mockRedisGet = jest.fn();
const mockRedisSetex = jest.fn();
const mockRedisDel = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: {
    get: (...args: unknown[]) => mockRedisGet(...args),
    setex: (...args: unknown[]) => mockRedisSetex(...args),
    del: (...args: unknown[]) => mockRedisDel(...args),
  },
}));

import { fetchFromAmadeus } from "@/lib/amadeusProvider";

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  mockRedisGet.mockResolvedValue(null);
  mockRedisSetex.mockResolvedValue(undefined);
  mockRedisDel.mockResolvedValue(undefined);
  process.env = { ...ORIGINAL_ENV, AMADEUS_API_KEY: "test-key", AMADEUS_API_SECRET: "test-secret" };
  global.fetch = jest.fn();
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

describe("fetchFromAmadeus — not configured", () => {
  it("returns [] silently when AMADEUS_API_KEY is missing", async () => {
    process.env.AMADEUS_API_KEY = "";
    const result = await fetchFromAmadeus("DSS", "CDG", "2026-09-01");
    expect(result).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns [] silently when AMADEUS_API_SECRET is missing", async () => {
    process.env.AMADEUS_API_SECRET = "";
    const result = await fetchFromAmadeus("DSS", "CDG", "2026-09-01");
    expect(result).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("fetchFromAmadeus — OAuth2 token handling", () => {
  it("requests a fresh token when Redis cache is empty, then fetches offers", async () => {
    mockRedisGet.mockResolvedValueOnce(null); // token cache miss
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "fresh-token", expires_in: 1800 }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });

    await fetchFromAmadeus("DSS", "CDG", "2026-09-01");

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/v1/security/oauth2/token"),
      expect.objectContaining({ method: "POST" })
    );
    expect(mockRedisSetex).toHaveBeenCalledWith(
      "amadeus:oauth:token",
      expect.any(Number),
      "fresh-token"
    );
  });

  it("reuses a cached token without calling the OAuth endpoint", async () => {
    mockRedisGet.mockResolvedValueOnce("cached-token"); // token cache hit
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });

    await fetchFromAmadeus("DSS", "CDG", "2026-09-01");

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/v2/shopping/flight-offers"),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer cached-token" }) })
    );
  });

  it("drops the cached token on a 401 so the next call re-authenticates", async () => {
    mockRedisGet.mockResolvedValueOnce("stale-token");
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 401, text: async () => "" });

    const result = await fetchFromAmadeus("DSS", "CDG", "2026-09-01");

    expect(result).toEqual([]);
    expect(mockRedisDel).toHaveBeenCalledWith("amadeus:oauth:token");
  });

  it("returns [] when the token endpoint itself fails", async () => {
    mockRedisGet.mockResolvedValueOnce(null);
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 401 });

    const result = await fetchFromAmadeus("DSS", "CDG", "2026-09-01");

    expect(result).toEqual([]);
  });
});

describe("fetchFromAmadeus — offer parsing", () => {
  beforeEach(() => {
    mockRedisGet.mockResolvedValueOnce("cached-token"); // skip OAuth round-trip
  });

  it("parses a direct-flight offer into a NormalizedFlight", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "1",
            price: { total: "450.00", currency: "USD" },
            itineraries: [
              {
                duration: "PT7H30M",
                segments: [
                  {
                    departure: { iataCode: "DSS", at: "2026-09-01T10:00:00" },
                    arrival:   { iataCode: "CDG", at: "2026-09-01T17:30:00" },
                    carrierCode: "AF",
                  },
                ],
              },
            ],
          },
        ],
      }),
    });

    const result = await fetchFromAmadeus("DSS", "CDG", "2026-09-01");

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      from: "DSS",
      to: "CDG",
      price: 450,
      airlines: ["Air France"],
      stops: 0,
      duration: 450,
    });
  });

  it("computes stops from segment count for connecting itineraries", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "2",
            price: { total: "600.00", currency: "USD" },
            itineraries: [
              {
                segments: [
                  { departure: { iataCode: "DSS", at: "2026-09-01T10:00:00" }, arrival: { iataCode: "IST", at: "2026-09-01T16:00:00" }, carrierCode: "TK" },
                  { departure: { iataCode: "IST", at: "2026-09-01T18:00:00" }, arrival: { iataCode: "CDG", at: "2026-09-01T21:00:00" }, carrierCode: "TK" },
                ],
              },
            ],
          },
        ],
      }),
    });

    const result = await fetchFromAmadeus("DSS", "CDG", "2026-09-01");

    expect(result).toHaveLength(1);
    expect(result[0].stops).toBe(1);
    expect(result[0].airlines).toEqual(["Turkish Airlines"]);
  });

  it("skips offers with a zero or missing price", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "3",
            price: { total: "0", currency: "USD" },
            itineraries: [{ segments: [{ departure: { iataCode: "DSS", at: "x" }, arrival: { iataCode: "CDG", at: "y" }, carrierCode: "AF" }] }],
          },
        ],
      }),
    });

    const result = await fetchFromAmadeus("DSS", "CDG", "2026-09-01");
    expect(result).toEqual([]);
  });

  it("returns [] when the API responds with no data array", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    const result = await fetchFromAmadeus("DSS", "CDG", "2026-09-01");
    expect(result).toEqual([]);
  });

  it("deduplicates offers with the same airline+stops, keeping the cheaper one", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "a",
            price: { total: "500", currency: "USD" },
            itineraries: [{ segments: [{ departure: { iataCode: "DSS", at: "x" }, arrival: { iataCode: "CDG", at: "y" }, carrierCode: "AF" }] }],
          },
          {
            id: "b",
            price: { total: "420", currency: "USD" },
            itineraries: [{ segments: [{ departure: { iataCode: "DSS", at: "x" }, arrival: { iataCode: "CDG", at: "y" }, carrierCode: "AF" }] }],
          },
        ],
      }),
    });

    const result = await fetchFromAmadeus("DSS", "CDG", "2026-09-01");
    expect(result).toHaveLength(1);
    expect(result[0].price).toBe(420);
  });
});

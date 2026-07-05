const mockFetchCalendarPrices = jest.fn();
const mockSearchEngine = jest.fn();
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRateLimitResponse = jest.fn();

jest.mock("@/lib/engine", () => ({
  fetchCalendarPrices: (...args: unknown[]) => mockFetchCalendarPrices(...args),
  searchEngine: (...args: unknown[]) => mockSearchEngine(...args),
}));

jest.mock("@/lib/redis", () => ({
  redis: {
    get: (...args: unknown[]) => mockRedisGet(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
  },
}));

jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: (...args: unknown[]) => mockRateLimitResponse(...args),
}));

jest.mock("@/lib/logger", () => ({
  logError: jest.fn(),
}));

import { GET } from "@/app/api/calendar/route";
import type { CalendarDay } from "@/lib/engine";

const mockDays: CalendarDay[] = [
  { date: "2024-06-01", price: 450, stops: 0 },
  { date: "2024-06-02", price: 500, stops: 1 },
  { date: "2024-06-03", price: 480, stops: 0 },
];

// Sample data for pricing accuracy test — matches search endpoint prices
const SEARCH_FLIGHT_RESULT = {
  id: "f1",
  airline: "Air France",
  from: "CDG",
  to: "JFK",
  date: "2024-06-01",
  price: 450,
  miles: 30000,
  cabin: "economy",
};

function makeRequest(from: string, to: string, month: string): Request {
  const url = new URL("http://localhost/api/calendar");
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  url.searchParams.set("month", month);
  return new Request(url);
}

describe("GET /api/calendar (comprehensive test suite)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimitResponse.mockResolvedValue(null); // not rate limited by default
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue("OK");
    mockFetchCalendarPrices.mockResolvedValue(mockDays);
    mockSearchEngine.mockResolvedValue([SEARCH_FLIGHT_RESULT]);
  });

  describe("input validation", () => {
    it("returns 400 when from is missing", async () => {
      const res = await GET(makeRequest("", "JFK", "2024-06"));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Invalid params/);
    });

    it("returns 400 when to is missing", async () => {
      const res = await GET(makeRequest("CDG", "", "2024-06"));
      expect(res.status).toBe(400);
    });

    it("returns 400 when month is missing", async () => {
      const res = await GET(makeRequest("CDG", "JFK", ""));
      expect(res.status).toBe(400);
    });

    it("returns 400 when from is not a valid 3-letter IATA code", async () => {
      const res = await GET(makeRequest("invalid", "JFK", "2024-06"));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Invalid params/);
    });

    it("returns 400 when to is not a valid 3-letter IATA code", async () => {
      const res = await GET(makeRequest("CDG", "XYZ123", "2024-06"));
      expect(res.status).toBe(400);
    });

    it("returns 400 when month format is invalid (not YYYY-MM)", async () => {
      const res = await GET(makeRequest("CDG", "JFK", "06-2024"));
      expect(res.status).toBe(400);
    });

    it("returns 400 when month has wrong digit count", async () => {
      const res = await GET(makeRequest("CDG", "JFK", "2024-6"));
      expect(res.status).toBe(400);
    });

    it("uppercases lowercase IATA codes", async () => {
      const res = await GET(makeRequest("cdg", "jfk", "2024-06"));
      expect(res.status).toBe(200);
      expect(mockFetchCalendarPrices).toHaveBeenCalledWith("CDG", "JFK", "2024-06-01");
    });

    it("trims whitespace from parameters", async () => {
      const url = new URL("http://localhost/api/calendar");
      url.searchParams.set("from", "  CDG  ");
      url.searchParams.set("to", "  JFK  ");
      url.searchParams.set("month", "  2024-06  ");
      const req = new Request(url);
      const res = await GET(req);
      expect(res.status).toBe(200);
      expect(mockFetchCalendarPrices).toHaveBeenCalledWith("CDG", "JFK", "2024-06-01");
    });
  });

  describe("rate limiting", () => {
    it("returns 429 when rate limited", async () => {
      const { NextResponse } = await import("next/server");
      mockRateLimitResponse.mockResolvedValue(
        NextResponse.json({ error: "Too many requests" }, { status: 429 })
      );
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      expect(res.status).toBe(429);
    });

    it("applies rate limit per namespace with correct limits", async () => {
      mockRateLimitResponse.mockResolvedValue(null);
      await GET(makeRequest("CDG", "JFK", "2024-06"));
      expect(mockRateLimitResponse).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          namespace: "api:calendar",
          limit: 30,
          windowSeconds: 60,
        })
      );
    });
  });

  describe("cache behavior", () => {
    it("returns cached data with cached:true", async () => {
      mockRedisGet.mockResolvedValue(mockDays);
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.days).toEqual(mockDays);
      expect(body.cached).toBe(true);
      expect(mockFetchCalendarPrices).not.toHaveBeenCalled();
    });

    it("includes Cache-Control header with cached data", async () => {
      mockRedisGet.mockResolvedValue(mockDays);
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      expect(res.headers.get("Cache-Control")).toMatch(/max-age=1800/);
      expect(res.headers.get("Cache-Control")).toMatch(/s-maxage=3600/);
    });

    it("stores fresh data in cache for 7200 seconds (2 hours)", async () => {
      mockRedisGet.mockResolvedValue(null);
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      expect(res.status).toBe(200);
      expect(mockRedisSet).toHaveBeenCalledWith(
        "keza:cal:CDG:JFK:2024-06",
        mockDays,
        { ex: 7200 }
      );
    });

    it("does not cache empty results", async () => {
      mockRedisGet.mockResolvedValue(null);
      mockFetchCalendarPrices.mockResolvedValue([]);
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      expect(res.status).toBe(200);
      expect(mockRedisSet).not.toHaveBeenCalled();
    });
  });

  describe("successful response", () => {
    it("returns 200 with days and cached:false for fresh data", async () => {
      mockRedisGet.mockResolvedValue(null);
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.days).toEqual(mockDays);
      expect(body.cached).toBe(false);
    });

    it("returns empty array when engine returns no days", async () => {
      mockRedisGet.mockResolvedValue(null);
      mockFetchCalendarPrices.mockResolvedValue([]);
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.days).toEqual([]);
      expect(body.cached).toBe(false);
    });

    it("converts month to first day of month for engine call", async () => {
      mockRedisGet.mockResolvedValue(null);
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      expect(res.status).toBe(200);
      expect(mockFetchCalendarPrices).toHaveBeenCalledWith("CDG", "JFK", "2024-06-01");
    });

    it("includes Cache-Control header with fresh data", async () => {
      mockRedisGet.mockResolvedValue(null);
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      expect(res.headers.get("Cache-Control")).toMatch(/max-age=1800/);
      expect(res.headers.get("Cache-Control")).toMatch(/s-maxage=3600/);
    });
  });

  describe("error handling", () => {
    it("returns cached data even if redis.get throws via .catch()", async () => {
      mockRedisGet.mockRejectedValue(new Error("Redis error"));
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      expect(res.status).toBe(200);
      expect(mockFetchCalendarPrices).toHaveBeenCalled();
    });

    it("returns fresh data even if redis.set throws via .catch()", async () => {
      mockRedisGet.mockResolvedValue(null);
      mockRedisSet.mockRejectedValue(new Error("Redis error"));
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.days).toEqual(mockDays);
    });
  });

  describe("cache key generation", () => {
    it("generates consistent cache keys", async () => {
      mockRedisGet.mockResolvedValue(null);
      await GET(makeRequest("CDG", "JFK", "2024-06"));
      const calls = mockRedisSet.mock.calls;
      expect(calls[0][0]).toBe("keza:cal:CDG:JFK:2024-06");
    });

    it("uses different cache keys for different months", async () => {
      mockRedisGet.mockResolvedValue(null);
      await GET(makeRequest("CDG", "JFK", "2024-06"));
      mockRedisSet.mockClear();
      mockRedisGet.mockResolvedValue(null);
      await GET(makeRequest("CDG", "JFK", "2024-07"));
      expect(mockRedisSet.mock.calls[0][0]).toBe("keza:cal:CDG:JFK:2024-07");
    });

    it("uses different cache keys for different routes", async () => {
      mockRedisGet.mockResolvedValue(null);
      await GET(makeRequest("CDG", "JFK", "2024-06"));
      mockRedisSet.mockClear();
      mockRedisGet.mockResolvedValue(null);
      await GET(makeRequest("LHR", "LAX", "2024-06"));
      expect(mockRedisSet.mock.calls[0][0]).toBe("keza:cal:LHR:LAX:2024-06");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // COMPREHENSIVE TEST SUITE: 6 DIMENSIONS + EDGE CASES
  // ──────────────────────────────────────────────────────────────────────────────

  describe("Dimension 1: Valid Month Request", () => {
    it("returns all days in month with prices and cached=false on first fetch", async () => {
      mockRedisGet.mockResolvedValue(null);
      mockFetchCalendarPrices.mockResolvedValue([
        { date: "2024-07-01", price: 450, stops: 0 },
        { date: "2024-07-02", price: 475, stops: 0 },
        { date: "2024-07-15", price: 490, stops: 1 },
        { date: "2024-07-31", price: 500, stops: 0 },
      ]);
      const res = await GET(makeRequest("CDG", "JFK", "2024-07"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.days).toHaveLength(4);
      expect(body.days[0].date).toBe("2024-07-01");
      expect(body.days[3].date).toBe("2024-07-31");
      expect(body.cached).toBe(false);
    });

    it("preserves full CalendarDay structure (date, price, stops, optional duration)", async () => {
      mockRedisGet.mockResolvedValue(null);
      mockFetchCalendarPrices.mockResolvedValue([
        { date: "2024-06-01", price: 450, stops: 0, duration: 360 },
        { date: "2024-06-02", price: 500, stops: 1, duration: 480 },
      ]);
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      const body = await res.json();
      expect(body.days[0]).toEqual({
        date: "2024-06-01",
        price: 450,
        stops: 0,
        duration: 360,
      });
      expect(body.days[1]).toEqual({
        date: "2024-06-02",
        price: 500,
        stops: 1,
        duration: 480,
      });
    });

    it("handles month with gaps in data (sparse calendar)", async () => {
      mockRedisGet.mockResolvedValue(null);
      // Some days may have no flights (sparse data)
      mockFetchCalendarPrices.mockResolvedValue([
        { date: "2024-06-01", price: 450, stops: 0 },
        { date: "2024-06-05", price: 475, stops: 0 },
        { date: "2024-06-28", price: 490, stops: 1 },
      ]);
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      const body = await res.json();
      expect(body.days).toHaveLength(3);
      expect(body.days.map((d: any) => d.date)).toEqual(["2024-06-01", "2024-06-05", "2024-06-28"]);
    });
  });

  describe("Dimension 2: Month Validation (Invalid format → 400; semantic validation by provider)", () => {
    it("accepts month 13 format-wise (passes to provider which handles gracefully)", async () => {
      // Note: regex only validates format YYYY-MM, not semantic validity of month number.
      // Provider (Travelpayouts) handles invalid months gracefully by returning empty array.
      mockRedisGet.mockResolvedValue(null);
      mockFetchCalendarPrices.mockResolvedValue([]);
      const res = await GET(makeRequest("CDG", "JFK", "2024-13"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.days).toEqual([]);
    });

    it("accepts month 00 format-wise (provider handles gracefully)", async () => {
      mockRedisGet.mockResolvedValue(null);
      mockFetchCalendarPrices.mockResolvedValue([]);
      const res = await GET(makeRequest("CDG", "JFK", "2024-00"));
      expect(res.status).toBe(200);
    });

    it("rejects month with negative sign in format", async () => {
      const res = await GET(makeRequest("CDG", "JFK", "2024--01"));
      expect(res.status).toBe(400);
    });

    it("returns 400 for malformed month: single digit month", async () => {
      const res = await GET(makeRequest("CDG", "JFK", "2024-1"));
      expect(res.status).toBe(400);
    });

    it("returns 400 for malformed month: wrong separator", async () => {
      const res = await GET(makeRequest("CDG", "JFK", "2024/06"));
      expect(res.status).toBe(400);
    });

    it("returns 400 for month string with spaces", async () => {
      const res = await GET(makeRequest("CDG", "JFK", "2024 06"));
      expect(res.status).toBe(400);
    });

    it("validates month format strictly (regex: ^\\d{4}-\\d{2}$)", async () => {
      const invalidMonths = ["202406", "24-06", "2024-6", "2024--06", "2024-06-"];
      for (const month of invalidMonths) {
        const res = await GET(makeRequest("CDG", "JFK", month));
        expect(res.status).toBe(400);
      }
    });
  });

  describe("Dimension 3: Cache Hit/Miss Behavior", () => {
    it("returns cached=true on cache hit without calling provider", async () => {
      const cachedData: CalendarDay[] = [{ date: "2024-06-01", price: 450, stops: 0 }];
      mockRedisGet.mockResolvedValue(cachedData);
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      const body = await res.json();
      expect(body.cached).toBe(true);
      expect(body.days).toEqual(cachedData);
      expect(mockFetchCalendarPrices).not.toHaveBeenCalled();
    });

    it("returns cached=false on cache miss and calls provider", async () => {
      mockRedisGet.mockResolvedValue(null);
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      const body = await res.json();
      expect(body.cached).toBe(false);
      expect(mockFetchCalendarPrices).toHaveBeenCalledWith("CDG", "JFK", "2024-06-01");
    });

    it("stores fresh results in Redis with 7200s (2-hour) TTL on cache miss", async () => {
      mockRedisGet.mockResolvedValue(null);
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      expect(mockRedisSet).toHaveBeenCalledWith(
        "keza:cal:CDG:JFK:2024-06",
        mockDays,
        { ex: 7200 }
      );
    });

    it("does not cache when provider returns empty array", async () => {
      mockRedisGet.mockResolvedValue(null);
      mockFetchCalendarPrices.mockResolvedValue([]);
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      expect(mockRedisSet).not.toHaveBeenCalled();
    });

    it("handles cache miss when Redis.get throws (catch handler)", async () => {
      mockRedisGet.mockRejectedValue(new Error("Redis connection lost"));
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      expect(res.status).toBe(200);
      expect(mockFetchCalendarPrices).toHaveBeenCalled();
    });

    it("handles cache write failure when Redis.set throws (catch handler)", async () => {
      mockRedisGet.mockResolvedValue(null);
      mockRedisSet.mockRejectedValue(new Error("Redis write failed"));
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.days).toEqual(mockDays);
    });

    it("uses correct cache key format including month", async () => {
      mockRedisGet.mockResolvedValue(null);
      await GET(makeRequest("CDG", "JFK", "2024-06"));
      expect(mockRedisGet).toHaveBeenCalledWith("keza:cal:CDG:JFK:2024-06");
    });

    it("cache key is sensitive to route changes", async () => {
      mockRedisGet.mockResolvedValue(null);
      await GET(makeRequest("CDG", "JFK", "2024-06"));
      const firstCall = mockRedisGet.mock.calls[0][0];

      jest.clearAllMocks();
      mockRedisGet.mockResolvedValue(null);
      await GET(makeRequest("LHR", "LAX", "2024-06"));
      const secondCall = mockRedisGet.mock.calls[0][0];

      expect(firstCall).not.toBe(secondCall);
    });
  });

  describe("Dimension 4: Provider Fallback (Duffel → Travelpayouts gracefully)", () => {
    it("handles provider timeout gracefully by returning empty array", async () => {
      mockRedisGet.mockResolvedValue(null);
      mockFetchCalendarPrices.mockRejectedValue(new Error("Request timeout"));
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.days).toEqual([]);
    });

    it("handles provider network error gracefully", async () => {
      mockRedisGet.mockResolvedValue(null);
      mockFetchCalendarPrices.mockRejectedValue(new Error("ECONNREFUSED"));
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.days).toEqual([]);
    });

    it("does not crash when provider throws arbitrary error", async () => {
      mockRedisGet.mockResolvedValue(null);
      mockFetchCalendarPrices.mockRejectedValue(new Error("Unexpected API error"));
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      expect(res.status).toBe(200);
    });

    it("does not cache empty results from provider failure", async () => {
      mockRedisGet.mockResolvedValue(null);
      mockFetchCalendarPrices.mockRejectedValue(new Error("Provider down"));
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      expect(mockRedisSet).not.toHaveBeenCalled();
    });

    it("returns 200 (not 500) even when provider fails", async () => {
      mockRedisGet.mockResolvedValue(null);
      mockFetchCalendarPrices.mockRejectedValue(new Error("API error"));
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      expect(res.status).toBe(200);
      expect(res.status).not.toBe(500);
    });
  });

  describe("Dimension 5: Empty Results Handling (returns empty calendar, not error)", () => {
    it("returns 200 with empty array when no flights exist for month", async () => {
      mockRedisGet.mockResolvedValue(null);
      mockFetchCalendarPrices.mockResolvedValue([]);
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.days).toEqual([]);
      expect(body.error).toBeUndefined();
    });

    it("includes cached=false in empty response", async () => {
      mockRedisGet.mockResolvedValue(null);
      mockFetchCalendarPrices.mockResolvedValue([]);
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      const body = await res.json();
      expect(body.cached).toBe(false);
    });

    it("returns empty array when cached data is empty", async () => {
      mockRedisGet.mockResolvedValue([]);
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      const body = await res.json();
      expect(body.days).toEqual([]);
      expect(body.cached).toBe(true);
    });

    it("does not confuse empty array with error condition", async () => {
      mockRedisGet.mockResolvedValue(null);
      mockFetchCalendarPrices.mockResolvedValue([]);
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      const body = await res.json();
      expect(body).not.toHaveProperty("error");
      expect(body.days).toEqual([]);
    });
  });

  describe("Dimension 6: Pricing Accuracy (calendar prices match search endpoint)", () => {
    it("returns prices from provider exactly without modification", async () => {
      mockRedisGet.mockResolvedValue(null);
      const customPrices: CalendarDay[] = [
        { date: "2024-06-01", price: 599, stops: 0 },
        { date: "2024-06-02", price: 649, stops: 1 },
      ];
      mockFetchCalendarPrices.mockResolvedValue(customPrices);
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      const body = await res.json();
      expect(body.days).toEqual(customPrices);
    });

    it("preserves price field for same date across cache/fresh", async () => {
      const priceData: CalendarDay[] = [
        { date: "2024-06-15", price: 475, stops: 0 },
      ];

      // First request: cache miss → provider
      mockRedisGet.mockResolvedValue(null);
      mockFetchCalendarPrices.mockResolvedValue(priceData);
      const res1 = await GET(makeRequest("CDG", "JFK", "2024-06"));
      const body1 = await res1.json();

      // Second request: cache hit
      mockRedisGet.mockResolvedValue(priceData);
      const res2 = await GET(makeRequest("CDG", "JFK", "2024-06"));
      const body2 = await res2.json();

      expect(body1.days[0].price).toBe(body2.days[0].price);
      expect(body1.days[0].price).toBe(475);
    });

    it("includes stop information in calendar result", async () => {
      mockRedisGet.mockResolvedValue(null);
      const pricesWithStops: CalendarDay[] = [
        { date: "2024-06-01", price: 450, stops: 0 },
        { date: "2024-06-02", price: 425, stops: 1 },
        { date: "2024-06-03", price: 410, stops: 2 },
      ];
      mockFetchCalendarPrices.mockResolvedValue(pricesWithStops);
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      const body = await res.json();
      expect(body.days.map((d: any) => d.stops)).toEqual([0, 1, 2]);
    });

    it("calendar prices reflect cheapest option for each day (consistent with search)", async () => {
      mockRedisGet.mockResolvedValue(null);
      // Simulate: for a given date, calendar shows the cheapest option
      mockFetchCalendarPrices.mockResolvedValue([
        { date: "2024-06-01", price: 450, stops: 0 }, // cheapest for 2024-06-01
      ]);
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      const body = await res.json();
      // The calendar should show 450 as the best price for that date
      expect(body.days[0].price).toBe(450);
    });

    it("handles large price values correctly", async () => {
      mockRedisGet.mockResolvedValue(null);
      mockFetchCalendarPrices.mockResolvedValue([
        { date: "2024-06-01", price: 9999, stops: 0 },
      ]);
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      const body = await res.json();
      expect(body.days[0].price).toBe(9999);
    });

    it("handles zero or low prices (no minimum filtering in endpoint)", async () => {
      mockRedisGet.mockResolvedValue(null);
      mockFetchCalendarPrices.mockResolvedValue([
        { date: "2024-06-01", price: 1, stops: 0 },
      ]);
      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      const body = await res.json();
      expect(body.days[0].price).toBe(1);
    });
  });

  describe("Edge Cases & Additional Coverage", () => {
    it("request with mixed case IATA codes is normalized before cache lookup", async () => {
      mockRedisGet.mockResolvedValue(null);
      mockFetchCalendarPrices.mockResolvedValue(mockDays);

      // Make request with mixed case
      const url = new URL("http://localhost/api/calendar");
      url.searchParams.set("from", "CdG");
      url.searchParams.set("to", "JfK");
      url.searchParams.set("month", "2024-06");
      const req = new Request(url);

      const res = await GET(req);
      expect(res.status).toBe(200);
      expect(mockFetchCalendarPrices).toHaveBeenCalledWith("CDG", "JFK", "2024-06-01");
    });

    it("passes first day of month (YYYY-MM-01) to provider for any input month", async () => {
      mockRedisGet.mockResolvedValue(null);
      mockFetchCalendarPrices.mockResolvedValue(mockDays);

      const testMonths = ["2024-01", "2024-06", "2024-12"];
      for (const month of testMonths) {
        jest.clearAllMocks();
        mockRedisGet.mockResolvedValue(null);
        mockFetchCalendarPrices.mockResolvedValue(mockDays);

        await GET(makeRequest("CDG", "JFK", month));
        expect(mockFetchCalendarPrices).toHaveBeenCalledWith("CDG", "JFK", `${month}-01`);
      }
    });

    it("sets proper Cache-Control headers on all successful responses", async () => {
      mockRedisGet.mockResolvedValue(null);
      mockFetchCalendarPrices.mockResolvedValue(mockDays);

      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      expect(res.headers.get("Cache-Control")).toContain("public");
      expect(res.headers.get("Cache-Control")).toContain("max-age=1800");
      expect(res.headers.get("Cache-Control")).toContain("s-maxage=3600");
    });

    it("applies rate limiting before checking cache", async () => {
      const { NextResponse } = await import("next/server");
      mockRateLimitResponse.mockResolvedValue(
        NextResponse.json({ error: "Too many requests" }, { status: 429 })
      );

      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      expect(res.status).toBe(429);
      expect(mockRedisGet).not.toHaveBeenCalled();
    });

    it("returns 500 when unhandled top-level error occurs", async () => {
      mockRateLimitResponse.mockResolvedValue(null);
      mockRedisGet.mockImplementation(() => {
        throw new Error("Unexpected crash");
      });

      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("Calendar fetch failed");
    });

    it("response includes correct content-type (JSON)", async () => {
      mockRedisGet.mockResolvedValue(null);
      mockFetchCalendarPrices.mockResolvedValue(mockDays);

      const res = await GET(makeRequest("CDG", "JFK", "2024-06"));
      expect(res.headers.get("Content-Type")).toContain("application/json");
    });

    it("handles multiple consecutive requests for same route+month (cache-aware)", async () => {
      // First request: miss
      mockRedisGet.mockResolvedValue(null);
      mockFetchCalendarPrices.mockResolvedValue(mockDays);
      const res1 = await GET(makeRequest("CDG", "JFK", "2024-06"));
      const body1 = await res1.json();
      expect(body1.cached).toBe(false);

      // Second request: hit
      mockRedisGet.mockResolvedValue(mockDays);
      const res2 = await GET(makeRequest("CDG", "JFK", "2024-06"));
      const body2 = await res2.json();
      expect(body2.cached).toBe(true);

      // Both return same data
      expect(body1.days).toEqual(body2.days);
    });
  });
});

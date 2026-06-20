const mockFetchCalendarPrices = jest.fn();
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRateLimitResponse = jest.fn();

jest.mock("@/lib/engine", () => ({
  fetchCalendarPrices: (...args: unknown[]) => mockFetchCalendarPrices(...args),
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

import { GET } from "@/app/api/calendar/route";
import type { CalendarDay } from "@/lib/engine";

const mockDays: CalendarDay[] = [
  { date: "2024-06-01", price: 450, stops: 0 },
  { date: "2024-06-02", price: 500, stops: 1 },
  { date: "2024-06-03", price: 480, stops: 0 },
];

function makeRequest(from: string, to: string, month: string): Request {
  const url = new URL("http://localhost/api/calendar");
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  url.searchParams.set("month", month);
  return new Request(url);
}

describe("GET /api/calendar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimitResponse.mockResolvedValue(null); // not rate limited by default
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue("OK");
    mockFetchCalendarPrices.mockResolvedValue(mockDays);
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
});

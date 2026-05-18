const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRateLimitResponse = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: {
    get: (...args: unknown[]) => mockRedisGet(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
  },
}));

jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: (...args: unknown[]) => mockRateLimitResponse(...args),
}));

// Mock global fetch for the external exchange rate API
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { NextRequest } from "next/server";
import { GET } from "@/app/api/forex/route";

// needs > 5 entries to pass the Redis cache check, and > 10 to pass the API check
const MOCK_RATES = {
  EUR: 0.92, XOF: 605, GBP: 0.79, USD: 1, JPY: 150,
  CAD: 1.36, AUD: 1.53, CHF: 0.88, NGN: 1550, KES: 152, MAD: 10.0,
};

function makeRequest(country?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (country) headers["x-vercel-ip-country"] = country;
  return new NextRequest("http://localhost/api/forex", { headers });
}

describe("GET /api/forex", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimitResponse.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue("OK");
  });

  describe("rate limiting", () => {
    it("returns 429 when rate limited", async () => {
      const { NextResponse } = await import("next/server");
      mockRateLimitResponse.mockResolvedValue(
        NextResponse.json({ error: "Too many requests" }, { status: 429 })
      );
      const res = await GET(makeRequest());
      expect(res.status).toBe(429);
    });
  });

  describe("cache hit", () => {
    it("returns cached rates without calling external API", async () => {
      mockRedisGet.mockResolvedValue(MOCK_RATES);
      const res = await GET(makeRequest());
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.base).toBe("USD");
      expect(body.rates).toMatchObject(MOCK_RATES);
      expect(body.usdToXof).toBe(605);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("cache miss — external API success", () => {
    it("fetches from external API and returns rates", async () => {
      mockRedisGet.mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ rates: MOCK_RATES }),
      });

      const res = await GET(makeRequest());
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.rates).toMatchObject({ EUR: 0.92, XOF: 605 });
      expect(mockRedisSet).toHaveBeenCalled();
    });
  });

  describe("cache miss — external API failure", () => {
    it("falls back to hardcoded rates when API fails", async () => {
      mockRedisGet.mockResolvedValue(null);
      mockFetch.mockRejectedValue(new Error("network error"));

      const res = await GET(makeRequest());
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.rates).toMatchObject({ XOF: 605 });
      expect(body.usdToXof).toBe(605);
    });
  });

  describe("currency auto-detection", () => {
    it("detects XOF for Senegal (SN)", async () => {
      mockRedisGet.mockResolvedValue(MOCK_RATES);
      const res = await GET(makeRequest("SN"));
      const body = await res.json();
      expect(body.detected.country).toBe("SN");
      expect(body.detected.currency).toBe("XOF");
    });

    it("detects EUR for France (FR)", async () => {
      mockRedisGet.mockResolvedValue(MOCK_RATES);
      const res = await GET(makeRequest("FR"));
      const body = await res.json();
      expect(body.detected.currency).toBe("EUR");
    });

    it("defaults to USD when no country header", async () => {
      mockRedisGet.mockResolvedValue(MOCK_RATES);
      const res = await GET(makeRequest());
      const body = await res.json();
      expect(body.detected.currency).toBe("USD");
      expect(body.detected.country).toBeNull();
    });
  });

  describe("response shape", () => {
    it("includes all required fields", async () => {
      mockRedisGet.mockResolvedValue(MOCK_RATES);
      const res = await GET(makeRequest());
      const body = await res.json();
      expect(body).toHaveProperty("base", "USD");
      expect(body).toHaveProperty("rates");
      expect(body).toHaveProperty("detected");
      expect(body).toHaveProperty("usdToXof");
      expect(body).toHaveProperty("updatedAt");
    });

    it("sets Cache-Control header", async () => {
      mockRedisGet.mockResolvedValue(MOCK_RATES);
      const res = await GET(makeRequest());
      expect(res.headers.get("Cache-Control")).toMatch(/s-maxage/);
    });
  });
});

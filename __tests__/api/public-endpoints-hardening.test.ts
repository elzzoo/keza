const mockRateLimitResponse = jest.fn();
const mockGetCachedRates = jest.fn();
const mockRedisZrange = jest.fn();
const mockLogError = jest.fn();

jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: (...args: unknown[]) => mockRateLimitResponse(...args),
}));

jest.mock("@/lib/exchange-rates", () => ({
  getCachedRates: (...args: unknown[]) => mockGetCachedRates(...args),
}));

jest.mock("@/lib/redis", () => ({
  redis: {
    zrange: (...args: unknown[]) => mockRedisZrange(...args),
  },
}));

jest.mock("@/lib/logger", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

import { GET as exchangeRatesGET } from "@/app/api/exchange-rates/route";
import { GET as trendingGET } from "@/app/api/trending/route";
import { GET as feedGET } from "@/app/api/feed/route";

function request(path: string): Request {
  return new Request(`http://localhost${path}`);
}

describe("public endpoint hardening", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimitResponse.mockResolvedValue(null);
    mockGetCachedRates.mockResolvedValue({ EUR: 0.92, XOF: 605 });
    mockRedisZrange.mockResolvedValue([]);
  });

  it("rate limits exchange rates before reading rates", async () => {
    mockRateLimitResponse.mockResolvedValue(
      Response.json({ error: "Too many requests" }, { status: 429 })
    );

    const res = await exchangeRatesGET(request("/api/exchange-rates"));

    expect(res.status).toBe(429);
    expect(mockGetCachedRates).not.toHaveBeenCalled();
  });

  it("returns cached exchange rates with CDN cache headers", async () => {
    const res = await exchangeRatesGET(request("/api/exchange-rates"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.rates).toEqual({ EUR: 0.92, XOF: 605 });
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=3600");
    expect(mockRateLimitResponse).toHaveBeenCalledWith(
      expect.any(Request),
      { namespace: "api:exchange-rates", limit: 60, windowSeconds: 60 }
    );
  });

  it("rate limits trending routes before touching Redis", async () => {
    mockRateLimitResponse.mockResolvedValue(
      Response.json({ error: "Too many requests" }, { status: 429 })
    );

    const res = await trendingGET(request("/api/trending"));

    expect(res.status).toBe(429);
    expect(mockRedisZrange).not.toHaveBeenCalled();
  });

  it("returns an empty trending payload when no route stats exist", async () => {
    const res = await trendingGET(request("/api/trending"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ routes: [] });
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=300");
  });

  it("rate limits the RSS feed before rendering it", async () => {
    mockRateLimitResponse.mockResolvedValue(
      Response.json({ error: "Too many requests" }, { status: 429 })
    );

    const res = await feedGET(request("/api/feed"));

    expect(res.status).toBe(429);
  });

  it("returns RSS feed XML with cache headers", async () => {
    const res = await feedGET(request("/api/feed"));
    const body = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/rss+xml");
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=3600");
    expect(body).toContain("<rss");
  });
});

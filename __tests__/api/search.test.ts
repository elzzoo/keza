const mockSearchEngine = jest.fn();
const mockGetForexRate = jest.fn();
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisIncr = jest.fn();
const mockRedisExpire = jest.fn();
const mockRateLimitResponse = jest.fn();

jest.mock("@/lib/engine", () => ({
  searchEngine: (...args: unknown[]) => mockSearchEngine(...args),
}));

jest.mock("@/lib/autoCalibrate", () => ({
  getForexRate: (...args: unknown[]) => mockGetForexRate(...args),
}));

jest.mock("@/lib/redis", () => ({
  redis: {
    get: (...args: unknown[]) => mockRedisGet(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
    incr: (...args: unknown[]) => mockRedisIncr(...args),
    expire: (...args: unknown[]) => mockRedisExpire(...args),
  },
}));

jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: (...args: unknown[]) => mockRateLimitResponse(...args),
}));

jest.mock("@/lib/logger", () => ({
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

import { POST } from "@/app/api/search/route";

const FLIGHT_RESULT = {
  id: "f1",
  airline: "Air France",
  from: "CDG",
  to: "DSS",
  date: "2025-06-01",
  price: 450,
  miles: 30000,
  cabin: "economy",
};

function makeRequest(body: object): Request {
  return new Request("http://localhost/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  from: "CDG",
  to: "DSS",
  date: "2025-06-01",
  cabin: "economy",
  tripType: "oneway",
  stops: "any",
  passengers: 1,
};

describe("POST /api/search", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimitResponse.mockResolvedValue(null); // not rate limited by default
    mockGetForexRate.mockResolvedValue(605);
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue("OK");
    mockRedisIncr.mockResolvedValue(1);
    mockRedisExpire.mockResolvedValue(1);
  });

  describe("input validation", () => {
    it("returns 400 when from is missing", async () => {
      const res = await POST(makeRequest({ ...VALID_BODY, from: undefined }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Invalid input/);
    });

    it("returns 400 when to is missing", async () => {
      const res = await POST(makeRequest({ ...VALID_BODY, to: undefined }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when date is missing", async () => {
      const res = await POST(makeRequest({ ...VALID_BODY, date: undefined }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when from is not a valid IATA code", async () => {
      const res = await POST(makeRequest({ ...VALID_BODY, from: "invalid" }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when date format is invalid", async () => {
      const res = await POST(makeRequest({ ...VALID_BODY, date: "01/06/2025" }));
      expect(res.status).toBe(400);
    });

    it("uppercases lowercase IATA codes", async () => {
      mockSearchEngine.mockResolvedValue([FLIGHT_RESULT]);
      const res = await POST(makeRequest({ ...VALID_BODY, from: "cdg", to: "dss" }));
      expect(res.status).toBe(200);
      expect(mockSearchEngine).toHaveBeenCalledWith(
        expect.objectContaining({ from: "CDG", to: "DSS" }),
        expect.any(String)
      );
    });

    it("clamps passengers to 1–9", async () => {
      mockSearchEngine.mockResolvedValue([FLIGHT_RESULT]);
      const res = await POST(makeRequest({ ...VALID_BODY, passengers: 99 }));
      expect(res.status).toBe(200);
      expect(mockSearchEngine).toHaveBeenCalledWith(
        expect.objectContaining({ passengers: 9 }),
        expect.any(String)
      );
    });

    it("defaults cabin to economy when unknown value provided", async () => {
      mockSearchEngine.mockResolvedValue([FLIGHT_RESULT]);
      const res = await POST(makeRequest({ ...VALID_BODY, cabin: "helicopter" }));
      expect(res.status).toBe(200);
      expect(mockSearchEngine).toHaveBeenCalledWith(
        expect.objectContaining({ cabin: "economy" }),
        expect.any(String)
      );
    });
  });

  describe("successful search", () => {
    it("returns results with forexRate and count", async () => {
      mockSearchEngine.mockResolvedValue([FLIGHT_RESULT]);
      const res = await POST(makeRequest(VALID_BODY));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.results).toHaveLength(1);
      expect(body.count).toBe(1);
      expect(body.forexRate).toBe(605);
      expect(body.partial).toBe(false);
    });

    it("returns empty results when engine returns empty array", async () => {
      mockSearchEngine.mockResolvedValue([]);
      const res = await POST(makeRequest(VALID_BODY));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.results).toHaveLength(0);
      expect(body.count).toBe(0);
    });
  });

  describe("rate limiting", () => {
    it("returns 429 when rate limited", async () => {
      const { NextResponse } = await import("next/server");
      mockRateLimitResponse.mockResolvedValue(
        NextResponse.json({ error: "Too many requests" }, { status: 429 })
      );
      const res = await POST(makeRequest(VALID_BODY));
      expect(res.status).toBe(429);
    });
  });

  describe("error handling", () => {
    it("returns 500 when searchEngine throws", async () => {
      mockSearchEngine.mockRejectedValue(new Error("engine failure"));
      const res = await POST(makeRequest(VALID_BODY));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("Search failed");
      expect(body.results).toEqual([]);
    });
  });
});

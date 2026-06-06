// Always-future date for tests — 90 days from test execution
const FUTURE_DATE = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const mockSearchEngine = jest.fn();
const mockGetForexRate = jest.fn();
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisIncr = jest.fn();
const mockRedisIncrby = jest.fn();
const mockRedisExpire = jest.fn();
const mockRedisZincrby = jest.fn();
const mockRateLimitResponse = jest.fn();
const mockLogWarn = jest.fn();

jest.mock("@/lib/engine", () => ({
  searchEngine: (...args: unknown[]) => mockSearchEngine(...args),
  CACHE_VERSION: "vTEST",
}));

jest.mock("@/lib/autoCalibrate", () => ({
  getForexRate: (...args: unknown[]) => mockGetForexRate(...args),
}));

jest.mock("@/lib/redis", () => ({
  redis: {
    get: (...args: unknown[]) => mockRedisGet(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
    incr: (...args: unknown[]) => mockRedisIncr(...args),
    incrby: (...args: unknown[]) => mockRedisIncrby(...args),
    expire: (...args: unknown[]) => mockRedisExpire(...args),
    zincrby: (...args: unknown[]) => mockRedisZincrby(...args),
  },
}));

jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: (...args: unknown[]) => mockRateLimitResponse(...args),
}));

jest.mock("@/lib/logger", () => ({
  logError: jest.fn(),
  logWarn: (...args: unknown[]) => mockLogWarn(...args),
}));

import { POST } from "@/app/api/search/route";

const FLIGHT_RESULT = {
  id: "f1",
  airline: "Air France",
  from: "CDG",
  to: "DSS",
  date: FUTURE_DATE,
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
  date: FUTURE_DATE,
  cabin: "economy",
  tripType: "oneway",
  stops: "any",
  passengers: 1,
};

describe("POST /api/search — timeout capture", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimitResponse.mockResolvedValue(null);
    mockGetForexRate.mockResolvedValue(605);
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue("OK");
    mockRedisIncr.mockResolvedValue(1);
    mockRedisIncrby.mockResolvedValue(1);
    mockRedisExpire.mockResolvedValue(1);
    mockRedisZincrby.mockResolvedValue(1);
  });

  it("captures timeout event in Sentry when searchEngine returns null", async () => {
    // Simulate timeout: searchEngine returns null
    mockSearchEngine.mockResolvedValue(null);
    // Cache returns one result as fallback
    mockRedisGet.mockResolvedValue([FLIGHT_RESULT]);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();

    // Verify partial flag is set
    expect(body.partial).toBe(true);
    expect(body.fromCache).toBe(true);

    // Verify logWarn was called with search context
    expect(mockLogWarn).toHaveBeenCalledWith(
      expect.stringContaining("timeout for CDG→DSS"),
      undefined,
      expect.objectContaining({
        route: "CDG-DSS",
        date: FUTURE_DATE,
        cabin: "economy",
        passengers: 1,
        tripType: "oneway",
        stops: "any",
        partialResultCount: 1,
        fromCache: true,
      })
    );
  });

  it("includes all search parameters in Sentry context", async () => {
    mockSearchEngine.mockResolvedValue(null);
    mockRedisGet.mockResolvedValue([FLIGHT_RESULT, FLIGHT_RESULT]);

    const searchBody = {
      from: "LAX",
      to: "NRT",
      date: FUTURE_DATE,
      cabin: "business",
      tripType: "roundtrip",
      returnDate: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      stops: "direct",
      passengers: 4,
    };

    const res = await POST(makeRequest(searchBody));
    expect(res.status).toBe(200);

    // Verify all search parameters are captured
    expect(mockLogWarn).toHaveBeenCalledWith(
      expect.any(String),
      undefined,
      expect.objectContaining({
        route: "LAX-NRT",
        date: searchBody.date,
        cabin: "business",
        passengers: 4,
        tripType: "roundtrip",
        returnDate: searchBody.returnDate,
        stops: "direct",
      })
    );
  });

  it("logs partial result count in Sentry context", async () => {
    mockSearchEngine.mockResolvedValue(null);
    const cachedResults = [FLIGHT_RESULT, FLIGHT_RESULT, FLIGHT_RESULT];
    mockRedisGet.mockResolvedValue(cachedResults);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);

    // Verify result count is captured
    expect(mockLogWarn).toHaveBeenCalledWith(
      expect.any(String),
      undefined,
      expect.objectContaining({
        partialResultCount: 3,
      })
    );
  });

  it("captures timeout even when no cached results available", async () => {
    mockSearchEngine.mockResolvedValue(null);
    mockRedisGet.mockResolvedValue(null); // No cached results

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();

    // Should still be partial
    expect(body.partial).toBe(true);
    expect(body.results).toHaveLength(0);

    // Verify logWarn was called even with 0 results
    expect(mockLogWarn).toHaveBeenCalledWith(
      expect.stringContaining("timeout"),
      undefined,
      expect.objectContaining({
        partialResultCount: 0,
      })
    );
  });

  it("does not log timeout when search completes successfully", async () => {
    mockSearchEngine.mockResolvedValue([FLIGHT_RESULT]);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();

    // Should not be partial
    expect(body.partial).toBe(false);

    // Verify logWarn was NOT called
    expect(mockLogWarn).not.toHaveBeenCalled();
  });
});

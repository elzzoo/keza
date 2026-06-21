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
const mockSentryCaptureMessage = jest.fn();

jest.mock("@/lib/engine", () => ({
  searchEngine: (...args: unknown[]) => mockSearchEngine(...args),
  CACHE_VERSION: "vTEST",
  CACHE_VERSION_FALLBACKS: ["v27", "v26"],
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

jest.mock("@sentry/nextjs", () => ({
  captureMessage: (...args: unknown[]) => mockSentryCaptureMessage(...args),
  withScope: jest.fn((callback) => callback({ setTag: jest.fn(), setExtra: jest.fn(), setLevel: jest.fn() })),
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

describe("POST /api/search — cache hit/miss tracking", () => {
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
    mockSentryCaptureMessage.mockResolvedValue(undefined);
  });

  it("logs cache miss to Sentry when search completes successfully", async () => {
    // Simulate normal search: engine returns results (not from cache)
    mockSearchEngine.mockResolvedValue([FLIGHT_RESULT]);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.partial).toBe(false);
    expect(body.fromCache).toBe(false);

    // Verify cache miss message logged to Sentry
    expect(mockSentryCaptureMessage).toHaveBeenCalledWith(
      "Cache miss: CDG→DSS computed 1 results",
      "debug"
    );
  });

  it("includes route info (FROM→TO) in cache miss message", async () => {
    mockSearchEngine.mockResolvedValue([FLIGHT_RESULT, FLIGHT_RESULT, FLIGHT_RESULT]);

    const searchBody = { ...VALID_BODY, from: "LAX", to: "NRT" };
    const res = await POST(makeRequest(searchBody));
    expect(res.status).toBe(200);

    // Verify route is in message
    expect(mockSentryCaptureMessage).toHaveBeenCalledWith(
      expect.stringContaining("LAX→NRT"),
      "debug"
    );

    // Verify result count is in message
    expect(mockSentryCaptureMessage).toHaveBeenCalledWith(
      expect.stringContaining("computed 3 results"),
      "debug"
    );
  });

  it("logs cache hit to Sentry when cached results returned on timeout", async () => {
    // Simulate timeout: searchEngine returns null, fallback to cache
    mockSearchEngine.mockResolvedValue(null);
    mockRedisGet.mockResolvedValue([FLIGHT_RESULT]);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.partial).toBe(true);
    expect(body.fromCache).toBe(true);

    // Verify cache hit message logged to Sentry
    expect(mockSentryCaptureMessage).toHaveBeenCalledWith(
      expect.stringContaining("Cache hit: CDG→DSS"),
      "debug"
    );

    // Verify version info is in message
    expect(mockSentryCaptureMessage).toHaveBeenCalledWith(
      expect.stringContaining("from vTEST"),
      "debug"
    );
  });

  it("includes route info in cache hit message", async () => {
    mockSearchEngine.mockResolvedValue(null);
    mockRedisGet.mockResolvedValue([FLIGHT_RESULT, FLIGHT_RESULT]);

    const searchBody = { ...VALID_BODY, from: "SIN", to: "LAX" };
    const res = await POST(makeRequest(searchBody));
    expect(res.status).toBe(200);

    // Verify route is in cache hit message
    expect(mockSentryCaptureMessage).toHaveBeenCalledWith(
      expect.stringContaining("Cache hit: SIN→LAX"),
      "debug"
    );
  });

  it("logs cache hit with version when falling back to older cache version", async () => {
    mockSearchEngine.mockResolvedValue(null);
    // First call (vTEST): returns null
    // Second call (v20): returns results
    mockRedisGet.mockResolvedValueOnce(null).mockResolvedValueOnce([FLIGHT_RESULT]);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);

    // Should log cache hit with the version that had results
    expect(mockSentryCaptureMessage).toHaveBeenCalledWith(
      expect.stringContaining("Cache hit: CDG→DSS from"),
      "debug"
    );
  });

  it("does not log cache hit when search completes successfully (normal path)", async () => {
    mockSearchEngine.mockResolvedValue([FLIGHT_RESULT]);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);

    // Verify only cache miss message, no cache hit
    const calls = mockSentryCaptureMessage.mock.calls;
    expect(calls.some((call) => call[0]?.includes("Cache hit"))).toBe(false);
    expect(calls.some((call) => call[0]?.includes("Cache miss"))).toBe(true);
  });

  it("does not log cache miss when results come from cache after timeout", async () => {
    mockSearchEngine.mockResolvedValue(null);
    mockRedisGet.mockResolvedValue([FLIGHT_RESULT]);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);

    // Verify only cache hit message, no cache miss
    const calls = mockSentryCaptureMessage.mock.calls;
    expect(calls.some((call) => call[0]?.includes("Cache miss"))).toBe(false);
    expect(calls.some((call) => call[0]?.includes("Cache hit"))).toBe(true);
  });

  it("logs cache hit even when no results cached (timeout with no fallback)", async () => {
    mockSearchEngine.mockResolvedValue(null);
    mockRedisGet.mockResolvedValue(null); // No cached results

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();

    // Should still be partial, no cache hit logged
    expect(body.partial).toBe(true);
    expect(body.fromCache).toBe(false);

    // Verify no cache hit was logged (no results to hit)
    const hitCalls = mockSentryCaptureMessage.mock.calls.filter((call) =>
      call[0]?.includes("Cache hit")
    );
    expect(hitCalls).toHaveLength(0);
  });

  it("uses debug level for cache hit/miss messages", async () => {
    mockSearchEngine.mockResolvedValue([FLIGHT_RESULT]);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);

    // Verify debug level is used
    expect(mockSentryCaptureMessage).toHaveBeenCalledWith(
      expect.any(String),
      "debug"
    );
  });

  it("tracks cache hit for different routes correctly", async () => {
    mockSearchEngine.mockResolvedValue(null);
    const results1 = [FLIGHT_RESULT];
    const results2 = [FLIGHT_RESULT, FLIGHT_RESULT];

    // First request: CDG→DSS
    mockRedisGet.mockResolvedValueOnce(results1);
    const res1 = await POST(makeRequest(VALID_BODY));
    expect(res1.status).toBe(200);

    // Reset mocks
    jest.clearAllMocks();
    mockSentryCaptureMessage.mockResolvedValue(undefined);
    mockSearchEngine.mockResolvedValue(null);

    // Second request: LAX→NRT
    const body2 = { ...VALID_BODY, from: "LAX", to: "NRT" };
    mockRedisGet.mockResolvedValueOnce(results2);
    const res2 = await POST(makeRequest(body2));
    expect(res2.status).toBe(200);

    // Verify each route's cache hit is logged with correct route
    expect(mockSentryCaptureMessage).toHaveBeenCalledWith(
      expect.stringContaining("Cache hit: LAX→NRT"),
      "debug"
    );
  });
});

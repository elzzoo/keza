/**
 * Tests for /api/search/stream endpoint
 * - Verifies streaming response headers and SSE format
 * - Validates input handling (rejects invalid IATA codes)
 */

const FUTURE_DATE = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

const mockSearchEngineStream = jest.fn();
const mockGetForexRate = jest.fn();
const mockRateLimitResponse = jest.fn();
const mockLogError = jest.fn();
const mockTrackSearchPerformance = jest.fn();

jest.mock("@/lib/engine/stream", () => ({
  searchEngineStream: (...args: unknown[]) => mockSearchEngineStream(...args),
}));

jest.mock("@/lib/engine", () => ({
  CACHE_VERSION: "v28",
}));

jest.mock("@/lib/autoCalibrate", () => ({
  getForexRate: (...args: unknown[]) => mockGetForexRate(...args),
}));

jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: (...args: unknown[]) => mockRateLimitResponse(...args),
}));

jest.mock("@/lib/logger", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
  logWarn: jest.fn(),
}));

jest.mock("@/lib/redis", () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock("@/lib/performance", () => ({
  trackSearchPerformance: (...args: unknown[]) =>
    mockTrackSearchPerformance(...args),
  isPerformanceAcceptable: jest.fn((ms: number) => ms < 5000),
}));

jest.mock("@sentry/nextjs", () => ({
  captureMessage: jest.fn(),
  captureEvent: jest.fn(),
  withScope: jest.fn((callback) =>
    callback({
      setTag: jest.fn(),
      setExtra: jest.fn(),
      setLevel: jest.fn(),
    })
  ),
}));

import { POST } from "@/app/api/search/stream/route";

describe("POST /api/search/stream", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimitResponse.mockResolvedValue(null);
    mockGetForexRate.mockResolvedValue(600);
  });

  describe("returns streaming response with correct headers", () => {
    it("should return SSE response with proper headers", async () => {
      mockSearchEngineStream.mockResolvedValue([
        {
          id: "flight-1",
          from: "SIN",
          to: "LAX",
          price: 500,
          airlines: ["SQ"],
        },
      ]);

      const request = new Request("http://localhost:3000/api/search/stream", {
        method: "POST",
        body: JSON.stringify({
          from: "SIN",
          to: "LAX",
          date: FUTURE_DATE,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/event-stream");
      expect(response.headers.get("Cache-Control")).toBe(
        "no-cache, no-transform"
      );
      expect(response.headers.get("X-Accel-Buffering")).toBe("no");
      expect(response.headers.get("Connection")).toBe("keep-alive");
      expect(response.headers.get("X-Request-Id")).toBeTruthy();
    });

    it("should stream final results with correct format", async () => {
      const mockResults = [
        {
          id: "flight-1",
          from: "SIN",
          to: "LAX",
          price: 500,
          airlines: ["SQ"],
          source: "DUFFEL" as const,
          milesOptions: [],
          recommendation: "USE_CASH" as const,
        },
      ];

      mockSearchEngineStream.mockResolvedValue(mockResults);

      const request = new Request("http://localhost:3000/api/search/stream", {
        method: "POST",
        body: JSON.stringify({
          from: "SIN",
          to: "LAX",
          date: FUTURE_DATE,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const body = await response.text();

      expect(body).toContain("type");
      expect(body).toContain("final");
      expect(body).toContain("results");
      expect(body).toContain("forexRate");
    });
  });

  describe("validates input (rejects invalid IATA codes)", () => {
    it("should reject request with invalid from code", async () => {
      const request = new Request("http://localhost:3000/api/search/stream", {
        method: "POST",
        body: JSON.stringify({
          from: "INVALID",
          to: "LAX",
          date: FUTURE_DATE,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toContain("Invalid input");
    });

    it("should reject request with invalid to code", async () => {
      const request = new Request("http://localhost:3000/api/search/stream", {
        method: "POST",
        body: JSON.stringify({
          from: "SIN",
          to: "INVALID",
          date: FUTURE_DATE,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toContain("Invalid input");
    });

    it("should reject request with invalid date format", async () => {
      const request = new Request("http://localhost:3000/api/search/stream", {
        method: "POST",
        body: JSON.stringify({
          from: "SIN",
          to: "LAX",
          date: "2024-13-01", // Invalid month
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toContain("Invalid input");
    });

    it("should accept lowercase IATA codes and convert to uppercase", async () => {
      mockSearchEngineStream.mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/search/stream", {
        method: "POST",
        body: JSON.stringify({
          from: "sin",
          to: "lax",
          date: FUTURE_DATE,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      // Verify searchEngineStream was called with uppercase codes
      expect(mockSearchEngineStream).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "SIN",
          to: "LAX",
        }),
        expect.any(Function),
        expect.any(String)
      );
    });

    it("should reject malformed JSON", async () => {
      const request = new Request("http://localhost:3000/api/search/stream", {
        method: "POST",
        body: "not valid json",
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe("Invalid JSON");
    });
  });

  describe("performance tracking", () => {
    it("should track performance metrics", async () => {
      mockSearchEngineStream.mockResolvedValue([
        {
          id: "flight-1",
          from: "SIN",
          to: "LAX",
          price: 500,
          airlines: ["SQ"],
        },
      ]);

      const request = new Request("http://localhost:3000/api/search/stream", {
        method: "POST",
        body: JSON.stringify({
          from: "SIN",
          to: "LAX",
          date: FUTURE_DATE,
        }),
        headers: { "Content-Type": "application/json" },
      });

      await POST(request);

      expect(mockTrackSearchPerformance).toHaveBeenCalledWith(
        "stream",
        expect.objectContaining({
          cacheHitTime: expect.any(Number),
          duffelTime: expect.any(Number),
          tpTime: expect.any(Number),
          totalTime: expect.any(Number),
        })
      );
    });
  });
});

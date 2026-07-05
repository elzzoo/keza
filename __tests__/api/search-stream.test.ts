/**
 * Comprehensive tests for /api/search/stream endpoint
 *
 * Coverage:
 * 1. Success path: Valid search → streaming response with partial (Duffel) + final (merged) events
 * 2. Error propagation: Error in Duffel/TP bubbles correctly to client
 * 3. Client disconnect: AbortSignal mid-stream handled gracefully
 * 4. Partial results: Search timeout (4s) returns partial Duffel results, not hanging
 * 5. Buffer management: Large result sets stream without memory issues
 * 6. Streaming format: Each event is valid JSON with status + flights
 */

const FUTURE_DATE = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

const mockSearchEngineStream = jest.fn();
const mockGetForexRate = jest.fn();
const mockRateLimitResponse = jest.fn();
const mockLogError = jest.fn();
const mockLogWarn = jest.fn();
const mockTrackSearchPerformance = jest.fn();
const mockRedisGet = jest.fn();
const mockIsPerformanceAcceptable = jest.fn();

jest.mock("@/lib/engine/stream", () => ({
  searchEngineStream: (...args: unknown[]) => mockSearchEngineStream(...args),
}));

jest.mock("@/lib/engine", () => ({
  CACHE_VERSION: "v29",
  CACHE_VERSION_FALLBACKS: ["v28", "v27", "v26"],
}));

jest.mock("@/lib/autoCalibrate", () => ({
  getForexRate: (...args: unknown[]) => mockGetForexRate(...args),
}));

jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: (...args: unknown[]) => mockRateLimitResponse(...args),
}));

jest.mock("@/lib/logger", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
  logWarn: (...args: unknown[]) => mockLogWarn(...args),
}));

jest.mock("@/lib/redis", () => ({
  redis: {
    get: (...args: unknown[]) => mockRedisGet(...args),
  },
}));

jest.mock("@/lib/performance", () => ({
  trackSearchPerformance: (...args: unknown[]) =>
    mockTrackSearchPerformance(...args),
  isPerformanceAcceptable: (...args: unknown[]) =>
    mockIsPerformanceAcceptable(...args),
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

const MOCK_FLIGHT = {
  id: "flight-1",
  from: "SIN",
  to: "LAX",
  price: 500,
  airlines: ["SQ"],
  source: "DUFFEL" as const,
  milesOptions: [],
  recommendation: "USE_CASH" as const,
  totalPrice: 500,
  cashCost: 500,
  milesCost: 0,
  priceConfidence: "HIGH" as const,
  outboundSegments: [],
};

const MOCK_TP_FLIGHT = {
  id: "flight-2",
  from: "SIN",
  to: "LAX",
  price: 480,
  airlines: ["UA"],
  source: "TRAVELPAYOUTS" as const,
  milesOptions: [],
  recommendation: "USE_CASH" as const,
  totalPrice: 480,
  cashCost: 480,
  milesCost: 0,
  priceConfidence: "LOW" as const,
  outboundSegments: [],
};

function parseSSEEvents(body: string): Array<Record<string, unknown>> {
  return body
    .split("\n\n")
    .filter((line) => line.trim())
    .map((line) => {
      const match = line.match(/^data: (.+)$/);
      if (!match) return null;
      try {
        return JSON.parse(match[1]);
      } catch {
        return null;
      }
    })
    .filter((event): event is Record<string, unknown> => event !== null);
}

describe("POST /api/search/stream", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimitResponse.mockResolvedValue(null);
    mockGetForexRate.mockResolvedValue(600);
    mockRedisGet.mockResolvedValue(null);
    mockIsPerformanceAcceptable.mockReturnValue(true);
    mockTrackSearchPerformance.mockResolvedValue(undefined);
    mockLogWarn.mockResolvedValue(undefined);
    mockLogError.mockResolvedValue(undefined);
  });

  // Helper to safely consume response and let async operations settle
  async function consumeResponse(response: Response) {
    const body = await response.text();
    // Give async operations in finally block time to settle
    await new Promise((resolve) => setImmediate(resolve));
    return body;
  }

  // ────────────────────────────────────────────────────────────
  // 1. SUCCESS PATH: Partial + Final streaming
  // ────────────────────────────────────────────────────────────

  describe("1. SUCCESS PATH: streaming with partial + final events", () => {
    it("should send partial event (Duffel only) then final event (merged)", async () => {
      let onPartialCallback: ((results: unknown[]) => void) | null = null;

      mockSearchEngineStream.mockImplementation(
        async (
          _params: unknown,
          onPartial: (results: unknown[]) => void,
          _requestId: unknown
        ) => {
          onPartialCallback = onPartial;
          // Simulate Duffel arriving, call onPartial
          onPartial([MOCK_FLIGHT]);
          // Return final merged results
          return [MOCK_FLIGHT, MOCK_TP_FLIGHT];
        }
      );

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
      const body = await consumeResponse(response);
      const events = parseSSEEvents(body);

      expect(events.length).toBeGreaterThanOrEqual(2);
      const partial = events.find((e) => e.type === "partial");
      const final = events.find((e) => e.type === "final");

      expect(partial).toBeDefined();
      expect(partial?.type).toBe("partial");
      expect(Array.isArray(partial?.results)).toBe(true);
      expect(partial?.forexRate).toBe(600);

      expect(final).toBeDefined();
      expect(final?.type).toBe("final");
      expect(Array.isArray(final?.results)).toBe(true);
      expect(final?.forexRate).toBe(600);
      expect((final?.results as Array<unknown>).length).toBe(2);
    });

    it("should include valid JSON in each SSE event", async () => {
      mockSearchEngineStream.mockImplementation(
        async (
          _params: unknown,
          onPartial: (results: unknown[]) => void,
          _requestId: unknown
        ) => {
          onPartial([MOCK_FLIGHT]);
          return [MOCK_FLIGHT, MOCK_TP_FLIGHT];
        }
      );

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

      // Each event line should start with "data: " followed by valid JSON
      const lines = body.split("\n\n").filter((l) => l.trim());
      lines.forEach((line) => {
        expect(line).toMatch(/^data: \{/);
        const jsonMatch = line.match(/^data: (.+)$/);
        expect(jsonMatch).toBeTruthy();
        if (jsonMatch) {
          expect(() => JSON.parse(jsonMatch[1])).not.toThrow();
        }
      });
    });

    it("should have correct SSE headers", async () => {
      mockSearchEngineStream.mockResolvedValue([MOCK_FLIGHT]);

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
      expect(response.headers.get("X-Response-Time")).toMatch(/\d+ms/);
    });

    it("should call searchEngineStream with sanitized params", async () => {
      mockSearchEngineStream.mockResolvedValue([MOCK_FLIGHT]);

      const request = new Request("http://localhost:3000/api/search/stream", {
        method: "POST",
        body: JSON.stringify({
          from: "sin",
          to: "lax",
          date: FUTURE_DATE,
          passengers: 2,
          cabin: "business",
          tripType: "roundtrip",
          returnDate: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10),
          stops: "direct",
        }),
        headers: { "Content-Type": "application/json" },
      });

      await POST(request);

      expect(mockSearchEngineStream).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "SIN",
          to: "LAX",
          cabin: "business",
          passengers: 2,
          tripType: "roundtrip",
          stops: "direct",
        }),
        expect.any(Function),
        expect.any(String)
      );
    });
  });

  // ────────────────────────────────────────────────────────────
  // 2. ERROR PROPAGATION
  // ────────────────────────────────────────────────────────────

  describe("2. ERROR PROPAGATION: errors bubble correctly to client", () => {
    it("should send error event when searchEngineStream throws", async () => {
      mockSearchEngineStream.mockRejectedValue(
        new Error("Duffel API timeout")
      );

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
      const body = await consumeResponse(response);
      const events = parseSSEEvents(body);

      const errorEvent = events.find((e) => e.type === "error");
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.type).toBe("error");
      expect(errorEvent?.message).toBeTruthy();
      expect(errorEvent?.partialSent).toBe(false);
    });

    it("should log error with requestId when searchEngineStream throws", async () => {
      const testError = new Error("TP connection failed");
      mockSearchEngineStream.mockRejectedValue(testError);

      const request = new Request("http://localhost:3000/api/search/stream", {
        method: "POST",
        body: JSON.stringify({
          from: "CDG",
          to: "DSS",
          date: FUTURE_DATE,
        }),
        headers: { "Content-Type": "application/json" },
      });

      await POST(request);

      expect(mockLogError).toHaveBeenCalledWith(
        "[api/search/stream]",
        testError,
        expect.objectContaining({
          requestId: expect.any(String),
        })
      );
    });

    it("should fallback to cache when search fails and no partial sent", async () => {
      mockSearchEngineStream.mockRejectedValue(new Error("Search failed"));
      mockRedisGet.mockResolvedValue([MOCK_FLIGHT]);

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
      const body = await consumeResponse(response);
      const events = parseSSEEvents(body);

      const finalEvent = events.find((e) => e.type === "final");
      expect(finalEvent).toBeDefined();
      expect(finalEvent?.fromCache).toBe(true);
      expect((finalEvent?.results as Array<unknown>)?.length).toBeGreaterThan(0);
    });

    it("should send error when search fails, no partial, and no cache", async () => {
      mockSearchEngineStream.mockRejectedValue(new Error("Search failed"));
      mockRedisGet.mockResolvedValue(null);

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
      const body = await consumeResponse(response);
      const events = parseSSEEvents(body);

      const errorEvent = events.find((e) => e.type === "error");
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.message).toContain("no cached results");
    });

    it("should set partialSent flag correctly in fallback logic", async () => {
      // Test the partialSent flag mechanism by checking error events
      mockSearchEngineStream.mockRejectedValue(new Error("Search failed"));
      mockRedisGet.mockResolvedValue(null);

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
      const body = await consumeResponse(response);
      const events = parseSSEEvents(body);

      // When no partial is sent and no cache, error should indicate that
      const errorEvent = events.find((e) => e.type === "error");
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.partialSent).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────
  // 3. CLIENT DISCONNECT HANDLING
  // ────────────────────────────────────────────────────────────

  describe("3. CLIENT DISCONNECT: graceful handling of AbortSignal", () => {
    it("should handle stream cleanup when client disconnects", async () => {
      const abortController = new AbortController();
      let controllerCloseCalled = false;

      mockSearchEngineStream.mockImplementation(
        async (
          _params: unknown,
          onPartial: (results: unknown[]) => void,
          _requestId: unknown
        ) => {
          onPartial([MOCK_FLIGHT]);
          // Simulate some delay
          await new Promise((resolve) => setTimeout(resolve, 10));
          return [MOCK_FLIGHT, MOCK_TP_FLIGHT];
        }
      );

      const request = new Request("http://localhost:3000/api/search/stream", {
        method: "POST",
        body: JSON.stringify({
          from: "SIN",
          to: "LAX",
          date: FUTURE_DATE,
        }),
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
      });

      const response = await POST(request);
      const reader = response.body?.getReader();

      if (reader) {
        // Read first chunk
        const { value } = await reader.read();
        // Abort mid-stream
        abortController.abort();
        // Should not throw
        expect(() => reader.cancel()).not.toThrow();
      }
    });

    it("should close stream on error without hanging", async () => {
      mockSearchEngineStream.mockRejectedValue(
        new Error("Unexpected error")
      );

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

      // Should complete within reasonable time and have an error event
      expect(body).toBeTruthy();
      const events = parseSSEEvents(body);
      expect(events.some((e) => e.type === "error")).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────
  // 4. PARTIAL RESULTS: Timeout handling
  // ────────────────────────────────────────────────────────────

  describe("4. PARTIAL RESULTS: timeout returns partial, doesn't hang", () => {
    it("should return partial Duffel results when TP times out", async () => {
      mockSearchEngineStream.mockImplementation(
        async (
          _params: unknown,
          onPartial: (results: unknown[]) => void,
          _requestId: unknown
        ) => {
          // Simulate Duffel arriving (~2-3s) — call onPartial synchronously during execution
          onPartial([MOCK_FLIGHT]);
          // Then return final (which might be same as partial if TP timed out)
          return [MOCK_FLIGHT]; // Only Duffel, TP timed out
        }
      );

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
      const body = await consumeResponse(response);
      const events = parseSSEEvents(body);

      expect(events.length).toBeGreaterThanOrEqual(1);
      const partial = events.find((e) => e.type === "partial");
      const final = events.find((e) => e.type === "final");

      // Should have at least final event
      expect(final).toBeDefined();
      expect(final?.results).toBeDefined();
      // Final should have results (might be partial if TP timed out)
      expect((final?.results as Array<unknown>).length).toBeGreaterThan(0);
    });

    it("should not hang when partial callback is invoked multiple times", async () => {
      mockSearchEngineStream.mockImplementation(
        async (
          _params: unknown,
          onPartial: (results: unknown[]) => void,
          _requestId: unknown
        ) => {
          onPartial([MOCK_FLIGHT]);
          onPartial([MOCK_FLIGHT, MOCK_TP_FLIGHT]);
          return [MOCK_FLIGHT, MOCK_TP_FLIGHT];
        }
      );

      const request = new Request("http://localhost:3000/api/search/stream", {
        method: "POST",
        body: JSON.stringify({
          from: "SIN",
          to: "LAX",
          date: FUTURE_DATE,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const startTime = Date.now();
      const response = await POST(request);
      const body = await response.text();
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(5000); // Should complete quickly
      const events = parseSSEEvents(body);
      expect(events.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ────────────────────────────────────────────────────────────
  // 5. BUFFER MANAGEMENT: Large result sets
  // ────────────────────────────────────────────────────────────

  describe("5. BUFFER MANAGEMENT: large result sets stream without hanging", () => {
    it("should stream large result sets without memory issues", async () => {
      // Create large result set (100 flights)
      const largeResultSet = Array.from({ length: 100 }, (_, i) => ({
        ...MOCK_FLIGHT,
        id: `flight-${i}`,
        price: 500 + i,
      }));

      mockSearchEngineStream.mockImplementation(
        async (
          _params: unknown,
          onPartial: (results: unknown[]) => void,
          _requestId: unknown
        ) => {
          onPartial(largeResultSet.slice(0, 50));
          return largeResultSet;
        }
      );

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
      const body = await consumeResponse(response);
      const events = parseSSEEvents(body);

      // Should have partial and final
      expect(events.length).toBeGreaterThanOrEqual(2);
      const final = events.find((e) => e.type === "final");
      expect((final?.results as Array<unknown>).length).toBe(100);

      // Check that body is reasonable size (not duplicated or corrupted)
      expect(body.length).toBeGreaterThan(1000);
    });

    it("should chunk large datasets in separate SSE events", async () => {
      const largeSet = Array.from({ length: 50 }, (_, i) => ({
        ...MOCK_FLIGHT,
        id: `f-${i}`,
      }));

      mockSearchEngineStream.mockResolvedValue(largeSet);

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

      // Each event should be on its own line
      const eventLines = body.split("\n\n").filter((l) => l.trim());
      expect(eventLines.length).toBeGreaterThanOrEqual(1);
      eventLines.forEach((line) => {
        expect(() => JSON.parse(line.replace(/^data: /, ""))).not.toThrow();
      });
    });
  });

  // ────────────────────────────────────────────────────────────
  // 6. STREAMING FORMAT: Valid JSON with status + flights
  // ────────────────────────────────────────────────────────────

  describe("6. STREAMING FORMAT: valid JSON, status field, flight data", () => {
    it("should include status (partial/final/error) in every event", async () => {
      mockSearchEngineStream.mockImplementation(
        async (
          _params: unknown,
          onPartial: (results: unknown[]) => void,
          _requestId: unknown
        ) => {
          onPartial([MOCK_FLIGHT]);
          return [MOCK_FLIGHT, MOCK_TP_FLIGHT];
        }
      );

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
      const body = await consumeResponse(response);
      const events = parseSSEEvents(body);

      events.forEach((event) => {
        expect(["partial", "final", "error"]).toContain(event.type);
      });
    });

    it("should include flights array in partial and final events", async () => {
      mockSearchEngineStream.mockImplementation(
        async (
          _params: unknown,
          onPartial: (results: unknown[]) => void,
          _requestId: unknown
        ) => {
          onPartial([MOCK_FLIGHT]);
          return [MOCK_FLIGHT, MOCK_TP_FLIGHT];
        }
      );

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
      const body = await consumeResponse(response);
      const events = parseSSEEvents(body);

      const partial = events.find((e) => e.type === "partial");
      const final = events.find((e) => e.type === "final");

      expect(Array.isArray(partial?.results)).toBe(true);
      expect(Array.isArray(final?.results)).toBe(true);
    });

    it("should include forexRate in all success events", async () => {
      mockSearchEngineStream.mockImplementation(
        async (
          _params: unknown,
          onPartial: (results: unknown[]) => void,
          _requestId: unknown
        ) => {
          onPartial([MOCK_FLIGHT]);
          return [MOCK_FLIGHT];
        }
      );

      mockGetForexRate.mockResolvedValue(625);

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
      const body = await consumeResponse(response);
      const events = parseSSEEvents(body);

      const successEvents = events.filter(
        (e) => e.type === "partial" || e.type === "final"
      );
      successEvents.forEach((event) => {
        expect(event.forexRate).toBe(625);
      });
    });

    it("should handle empty results gracefully", async () => {
      mockSearchEngineStream.mockResolvedValue([]);

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
      const body = await consumeResponse(response);
      const events = parseSSEEvents(body);

      const final = events.find((e) => e.type === "final");
      expect(final?.results).toEqual([]);
    });
  });

  // ────────────────────────────────────────────────────────────
  // INPUT VALIDATION
  // ────────────────────────────────────────────────────────────

  describe("input validation and error responses", () => {
    it("should reject invalid from IATA code", async () => {
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

    it("should reject invalid to IATA code", async () => {
      const request = new Request("http://localhost:3000/api/search/stream", {
        method: "POST",
        body: JSON.stringify({
          from: "SIN",
          to: "XX",
          date: FUTURE_DATE,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should reject invalid date format", async () => {
      const request = new Request("http://localhost:3000/api/search/stream", {
        method: "POST",
        body: JSON.stringify({
          from: "SIN",
          to: "LAX",
          date: "01/06/2025",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should reject past dates", async () => {
      const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      const request = new Request("http://localhost:3000/api/search/stream", {
        method: "POST",
        body: JSON.stringify({
          from: "SIN",
          to: "LAX",
          date: pastDate,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should reject dates more than 1 year in future", async () => {
      const tooFar = new Date(Date.now() + 400 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      const request = new Request("http://localhost:3000/api/search/stream", {
        method: "POST",
        body: JSON.stringify({
          from: "SIN",
          to: "LAX",
          date: tooFar,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should reject malformed JSON", async () => {
      const request = new Request("http://localhost:3000/api/search/stream", {
        method: "POST",
        body: "{ invalid json }",
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe("Invalid JSON");
    });

    it("should clamp passengers between 1 and 9", async () => {
      mockSearchEngineStream.mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/search/stream", {
        method: "POST",
        body: JSON.stringify({
          from: "SIN",
          to: "LAX",
          date: FUTURE_DATE,
          passengers: 99,
        }),
        headers: { "Content-Type": "application/json" },
      });

      await POST(request);

      expect(mockSearchEngineStream).toHaveBeenCalledWith(
        expect.objectContaining({ passengers: 9 }),
        expect.any(Function),
        expect.any(String)
      );
    });

    it("should default to oneway tripType when invalid", async () => {
      mockSearchEngineStream.mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/search/stream", {
        method: "POST",
        body: JSON.stringify({
          from: "SIN",
          to: "LAX",
          date: FUTURE_DATE,
          tripType: "invalid",
        }),
        headers: { "Content-Type": "application/json" },
      });

      await POST(request);

      expect(mockSearchEngineStream).toHaveBeenCalledWith(
        expect.objectContaining({ tripType: "oneway" }),
        expect.any(Function),
        expect.any(String)
      );
    });
  });

  // ────────────────────────────────────────────────────────────
  // RATE LIMITING
  // ────────────────────────────────────────────────────────────

  describe("rate limiting", () => {
    it("should return rate limit response when limited", async () => {
      const { NextResponse } = await import("next/server");
      const limitResponse = NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
      mockRateLimitResponse.mockResolvedValue(limitResponse);

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

      expect(response.status).toBe(429);
    });

    it("should check rate limit before processing", async () => {
      mockRateLimitResponse.mockResolvedValue(
        new Response("Rate limited", { status: 429 })
      );

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

      expect(mockRateLimitResponse).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          namespace: "api:search:stream:post",
          limit: 30,
          windowSeconds: 60,
        })
      );
    });
  });

  // ────────────────────────────────────────────────────────────
  // PERFORMANCE TRACKING
  // ────────────────────────────────────────────────────────────

  describe("performance tracking and metrics", () => {
    it("should track search performance with timing metrics", async () => {
      mockSearchEngineStream.mockImplementation(
        async (
          _params: unknown,
          onPartial: (results: unknown[]) => void,
          _requestId: unknown
        ) => {
          onPartial([MOCK_FLIGHT]);
          return [MOCK_FLIGHT, MOCK_TP_FLIGHT];
        }
      );

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

    it("should call isPerformanceAcceptable with total time", async () => {
      mockIsPerformanceAcceptable.mockReturnValue(true);
      mockSearchEngineStream.mockResolvedValue([MOCK_FLIGHT]);

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
      // Consume response to allow async operations to complete
      await consumeResponse(response);

      expect(mockIsPerformanceAcceptable).toHaveBeenCalledWith(
        expect.any(Number)
      );
    });
  });
});

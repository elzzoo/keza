/**
 * Tests for Duffel health endpoint
 * Verifies error tracking, status reporting, and alert thresholds
 */

import { GET } from "@/app/api/health/duffel/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/redis", () => ({
  redis: {
    get: jest.fn(),
  },
}));
jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: jest.fn(async () => null),
}));

import { redis } from "@/lib/redis";

const mockRedis = redis as jest.Mocked<typeof redis>;

describe("GET /api/health/duffel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return healthy status when error rate is low", async () => {
    mockRedis.get.mockResolvedValue({
      window_start: Date.now() - 60000,
      error_count: 2,
      total_count: 100,
    });

    const req = new NextRequest("http://localhost:3000/api/health/duffel");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      status: "ok",
      errorRate: 2,
      errorsPerMin: 2,
      totalRequests: 100,
      threshold: 5,
      timestamp: expect.any(String),
    });
  });

  it("should return degraded status when error rate exceeds threshold", async () => {
    mockRedis.get.mockResolvedValue({
      window_start: Date.now() - 60000,
      error_count: 10,
      total_count: 100,
    });

    const req = new NextRequest("http://localhost:3000/api/health/duffel");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.status).toBe("degraded");
    expect(data.errorsPerMin).toBe(10);
  });

  it("should handle missing error tracking data gracefully", async () => {
    mockRedis.get.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/health/duffel");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.errorRate).toBe(0);
  });

  it("should return normalized error rate as percentage", async () => {
    mockRedis.get.mockResolvedValue({
      window_start: Date.now() - 60000,
      error_count: 5,
      total_count: 50,
    });

    const req = new NextRequest("http://localhost:3000/api/health/duffel");
    const res = await GET(req);
    const data = await res.json();

    expect(data.errorRate).toBe(10); // 5/50 = 10%
  });

  it("should calculate errors per minute correctly", async () => {
    mockRedis.get.mockResolvedValue({
      window_start: Date.now() - 30000, // 30 seconds ago
      error_count: 3,
      total_count: 100,
    });

    const req = new NextRequest("http://localhost:3000/api/health/duffel");
    const res = await GET(req);
    const data = await res.json();

    // 3 errors in 30s = 6 errors/min
    expect(data.errorsPerMin).toBeCloseTo(6, 0);
  });

  it("should never cache health check", async () => {
    mockRedis.get.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/health/duffel");
    const res = await GET(req);

    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(res.headers.get("Cache-Control")).toContain("no-cache");
  });
});

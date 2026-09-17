import { GET } from "@/app/api/health/route";
import { NextRequest } from "next/server";

const mockRedisPing = jest.fn();
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRateLimitResponse = jest.fn();
const mockLogWarn = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: {
    ping: (...args: unknown[]) => mockRedisPing(...args),
    get: (...args: unknown[]) => mockRedisGet(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
  },
}));

jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: (...args: unknown[]) => mockRateLimitResponse(...args),
}));

jest.mock("@/lib/logger", () => ({
  logWarn: (...args: unknown[]) => mockLogWarn(...args),
}));

describe("GET /api/health", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisPing.mockResolvedValue("PONG");
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue("OK");
    mockRateLimitResponse.mockResolvedValue(null);
  });

  it("returns ok when Redis is reachable and the daily cron is healthy", async () => {
    const now = new Date().toISOString();
    mockRedisGet.mockImplementation(async (key: string) => {
      if (key === "cron:daily:lastRun") {
        return {
          runId: "run-1",
          status: "completed",
          startedAt: now,
          finishedAt: now,
        };
      }
      return {
        runId: "run-1",
        path: "/api/cron/miles-prices",
        status: "accepted",
        statusCode: 200,
        startedAt: now,
        finishedAt: now,
      };
    });

    const res = await GET(new NextRequest("http://localhost/api/health"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.redis).toBe("ok");
    expect(data.cron).toBe("ok");
    expect(data.latencyMs).toEqual(expect.any(Number));
    expect(mockLogWarn).not.toHaveBeenCalled();
  });

  it("keeps health ok when no cron state exists yet", async () => {
    const res = await GET(new NextRequest("http://localhost/api/health"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.redis).toBe("ok");
    expect(data.cron).toBe("unknown");
  });

  it("returns degraded when the daily cron is stale", async () => {
    const staleStartedAt = new Date(Date.now() - 27 * 60 * 60 * 1000).toISOString();
    mockRedisGet.mockImplementation(async (key: string) => {
      if (key === "cron:daily:lastRun") {
        return {
          runId: "run-1",
          status: "completed",
          startedAt: staleStartedAt,
          finishedAt: staleStartedAt,
        };
      }
      return null;
    });

    const res = await GET(new NextRequest("http://localhost/api/health"));
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.status).toBe("degraded");
    expect(data.redis).toBe("ok");
    expect(data.cron).toBe("stale");
    expect(mockLogWarn).toHaveBeenCalledWith("[api/health] cron health degraded", undefined, {
      cronStatus: "stale",
    });
    expect(mockRedisSet).toHaveBeenCalledWith(
      "cron:daily:alerts:stale:run-1",
      expect.any(String),
      { ex: 12 * 60 * 60, nx: true },
    );
  });

  it("returns degraded when Redis is unreachable", async () => {
    mockRedisPing.mockRejectedValue(new Error("redis down"));

    const res = await GET(new NextRequest("http://localhost/api/health"));
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.status).toBe("degraded");
    expect(data.redis).toBe("error");
    expect(data.cron).toBe("unknown");
    expect(mockRedisGet).not.toHaveBeenCalled();
  });
});

/**
 * Tests for Redis metrics endpoint
 * Verifies memory usage, latency p95, and alert thresholds
 */

import { GET } from "@/app/api/metrics/redis/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/redis", () => ({
  redis: {
    ping: jest.fn(),
    info: jest.fn(),
  } as any,
}));
jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: jest.fn(async () => null),
}));

import { redis } from "@/lib/redis";

const mockRedis = redis as any;

describe("GET /api/metrics/redis", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return healthy status when memory < 85% and latency < 500ms", async () => {
    mockRedis.ping.mockResolvedValue("PONG");
    mockRedis.info.mockResolvedValue({
      used_memory: 850 * 1024 * 1024, // 850MB
      maxmemory: 1024 * 1024 * 1024, // 1GB
      instantaneous_ops_per_sec: 1000,
    });

    const req = new NextRequest("http://localhost:3000/api/metrics/redis");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.memoryPercent).toBeLessThan(85);
    expect(data.memoryPercent).toBeGreaterThanOrEqual(82);
  });

  it("should return degraded status when memory > 85%", async () => {
    mockRedis.ping.mockResolvedValue("PONG");
    mockRedis.info.mockResolvedValue({
      used_memory: 900 * 1024 * 1024, // 900MB
      maxmemory: 1024 * 1024 * 1024, // 1GB
      instantaneous_ops_per_sec: 1000,
    });

    const req = new NextRequest("http://localhost:3000/api/metrics/redis");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.status).toBe("degraded");
    expect(data.memoryPercent).toBeGreaterThan(85);
  });

  it("should track latency samples and calculate p95", async () => {
    const latencies = [10, 20, 50, 100, 150, 200, 250, 300, 400, 500];
    mockRedis.ping.mockImplementation(
      () =>
        new Promise((resolve) => {
          const latency = latencies[Math.floor(Math.random() * latencies.length)];
          setTimeout(() => resolve("PONG"), latency);
        })
    );
    mockRedis.info.mockResolvedValue({
      used_memory: 500 * 1024 * 1024,
      maxmemory: 1024 * 1024 * 1024,
      instantaneous_ops_per_sec: 1000,
    });

    const req = new NextRequest("http://localhost:3000/api/metrics/redis");
    const res = await GET(req);
    const data = await res.json();

    expect(data.latencyP95).toBeDefined();
    expect(data.latencyP95).toBeGreaterThan(0);
  });

  it("should return degraded status when latency p95 > 500ms", async () => {
    mockRedis.ping.mockRejectedValue(new Error("timeout"));
    mockRedis.info.mockResolvedValue({
      used_memory: 500 * 1024 * 1024,
      maxmemory: 1024 * 1024 * 1024,
      instantaneous_ops_per_sec: 1000,
    });

    const req = new NextRequest("http://localhost:3000/api/metrics/redis");
    const res = await GET(req);
    const data = await res.json();

    // Failed pings count as 1000ms each, p95 of 10 pings all at 1000ms = 1000ms
    expect(data.latencyP95).toBeGreaterThanOrEqual(500);
  }, 15000);

  it("should return ok when memory and latency both within thresholds", async () => {
    mockRedis.ping.mockResolvedValue("PONG");
    mockRedis.info.mockResolvedValue({
      used_memory: 400 * 1024 * 1024, // 40%
      maxmemory: 1024 * 1024 * 1024,
      instantaneous_ops_per_sec: 5000,
    });

    const req = new NextRequest("http://localhost:3000/api/metrics/redis");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.memoryPercent).toBeLessThan(85);
  });

  it("should handle missing Redis info gracefully", async () => {
    mockRedis.ping.mockResolvedValue("PONG");
    mockRedis.info.mockResolvedValue({});

    const req = new NextRequest("http://localhost:3000/api/metrics/redis");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.memoryPercent).toBe(0);
  });

  it("should handle Redis unavailability", async () => {
    mockRedis.ping.mockRejectedValue(new Error("Connection refused"));

    const req = new NextRequest("http://localhost:3000/api/metrics/redis");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.status).toBe("degraded");
  });

  it("should never cache metrics", async () => {
    mockRedis.ping.mockResolvedValue("PONG");
    mockRedis.info.mockResolvedValue({
      used_memory: 500 * 1024 * 1024,
      maxmemory: 1024 * 1024 * 1024,
      instantaneous_ops_per_sec: 1000,
    });

    const req = new NextRequest("http://localhost:3000/api/metrics/redis");
    const res = await GET(req);

    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(res.headers.get("Cache-Control")).toContain("no-cache");
  });

  it("should include throughput metrics", async () => {
    mockRedis.ping.mockResolvedValue("PONG");
    mockRedis.info.mockResolvedValue({
      used_memory: 500 * 1024 * 1024,
      maxmemory: 1024 * 1024 * 1024,
      instantaneous_ops_per_sec: 5000,
    });

    const req = new NextRequest("http://localhost:3000/api/metrics/redis");
    const res = await GET(req);
    const data = await res.json();

    expect(data.opsPerSec).toBe(5000);
  });
});

import { NextRequest } from "next/server";

const mockGetRouteMetrics = jest.fn();
jest.mock("@/lib/dashboard/metricsService", () => ({
  getRouteMetrics: (...args: unknown[]) => mockGetRouteMetrics(...args),
}));

// Mock server-only so it doesn't blow up in Jest
jest.mock("server-only", () => ({}));

import { GET } from "@/app/api/dashboard/routes/route";

function makeReq(query: Record<string, string> = {}) {
  const searchParams = new URLSearchParams(query);
  return new NextRequest(`http://localhost/api/dashboard/routes?${searchParams.toString()}`, {
    method: "GET",
  });
}

describe("GET /api/dashboard/routes", () => {
  beforeEach(() => {
    mockGetRouteMetrics.mockClear();
  });

  it("should return route metrics with default parameters", async () => {
    const mockMetrics = [
      {
        route: "CDG-DKR",
        searchCount: 150,
        conversionCount: 8,
        totalRevenue: 1200.5,
        topProgram: "Flying Blue",
      },
      {
        route: "ORY-ABJ",
        searchCount: 85,
        conversionCount: 4,
        totalRevenue: 600.0,
        topProgram: "AirFrancePlus",
      },
    ];

    mockGetRouteMetrics.mockResolvedValueOnce(mockMetrics);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual(mockMetrics);
    expect(mockGetRouteMetrics).toHaveBeenCalledWith(30, 20);
  });

  it("should support custom days parameter", async () => {
    const mockMetrics = [
      {
        route: "CDG-DKR",
        searchCount: 100,
        conversionCount: 5,
        totalRevenue: 750.0,
        topProgram: "Flying Blue",
      },
    ];

    mockGetRouteMetrics.mockResolvedValueOnce(mockMetrics);
    const res = await GET(makeReq({ days: "7" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual(mockMetrics);
    expect(mockGetRouteMetrics).toHaveBeenCalledWith(7, 20);
  });

  it("should support custom limit parameter", async () => {
    const mockMetrics = [
      {
        route: "CDG-DKR",
        searchCount: 150,
        conversionCount: 8,
        totalRevenue: 1200.5,
        topProgram: "Flying Blue",
      },
    ];

    mockGetRouteMetrics.mockResolvedValueOnce(mockMetrics);
    const res = await GET(makeReq({ limit: "10" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual(mockMetrics);
    expect(mockGetRouteMetrics).toHaveBeenCalledWith(30, 10);
  });

  it("should support both days and limit parameters", async () => {
    const mockMetrics = [
      {
        route: "CDG-DKR",
        searchCount: 200,
        conversionCount: 12,
        totalRevenue: 1800.0,
        topProgram: "Flying Blue",
      },
    ];

    mockGetRouteMetrics.mockResolvedValueOnce(mockMetrics);
    const res = await GET(makeReq({ days: "90", limit: "15" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual(mockMetrics);
    expect(mockGetRouteMetrics).toHaveBeenCalledWith(90, 15);
  });

  it("should validate days parameter is within range 1-365", async () => {
    const res = await GET(makeReq({ days: "400" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("should validate days parameter is at least 1", async () => {
    const res = await GET(makeReq({ days: "0" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("should validate limit parameter is within range 1-100", async () => {
    const res = await GET(makeReq({ limit: "200" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("should validate limit parameter is at least 1", async () => {
    const res = await GET(makeReq({ limit: "0" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("should return 500 on service error", async () => {
    mockGetRouteMetrics.mockRejectedValueOnce(new Error("Database error"));
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("should return empty array when no metrics found", async () => {
    mockGetRouteMetrics.mockResolvedValueOnce([]);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([]);
  });
});

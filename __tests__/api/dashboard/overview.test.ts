import { NextRequest } from "next/server";

const mockGetKPIMetrics = jest.fn();
const mockGetDailySearchVolumes = jest.fn();

jest.mock("@/lib/dashboard/metricsService", () => ({
  getKPIMetrics: (...args: unknown[]) => mockGetKPIMetrics(...args),
  getDailySearchVolumes: (...args: unknown[]) => mockGetDailySearchVolumes(...args),
}));
jest.mock("@/lib/auth", () => ({ hasAdminSession: jest.fn(() => true) }));
jest.mock("@/lib/ratelimit", () => ({ rateLimitResponse: jest.fn(async () => null) }));

import { GET } from "@/app/api/dashboard/overview/route";

describe("GET /api/dashboard/overview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns measured KPIs and daily search counts in one response", async () => {
    mockGetKPIMetrics.mockResolvedValue({ totalSearches: 4, cacheHitRate: 25 });
    mockGetDailySearchVolumes.mockResolvedValue([
      { date: "2026-10-15", searches: 1 },
      { date: "2026-10-16", searches: 3 },
    ]);

    const response = await GET(new NextRequest("http://localhost/api/dashboard/overview?days=2"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      totalSearches: 4,
      cacheHitRate: 25,
      dailySearches: [
        { date: "2026-10-15", searches: 1 },
        { date: "2026-10-16", searches: 3 },
      ],
    });
    expect(mockGetKPIMetrics).toHaveBeenCalledWith(2);
    expect(mockGetDailySearchVolumes).toHaveBeenCalledWith(2);
  });
});

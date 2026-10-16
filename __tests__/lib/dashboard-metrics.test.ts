const mockPrisma = {
  analyticsSearch: {
    aggregate: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  },
  analyticsConversion: { aggregate: jest.fn() },
  analyticsAlert: { aggregate: jest.fn() },
  $queryRaw: jest.fn(),
};

jest.mock("@/lib/db", () => ({ prisma: mockPrisma }));

import { getDailySearchVolumes, getKPIMetrics } from "@/lib/dashboard/metricsService";

describe("dashboard metrics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("counts actual cache hits rather than all non-null cacheHit values", async () => {
    mockPrisma.analyticsSearch.aggregate.mockResolvedValue({
      _count: 10,
      _avg: { duration: 250 },
    });
    mockPrisma.analyticsConversion.aggregate.mockResolvedValue({
      _count: 2,
      _sum: { conversionValue: 50 },
    });
    mockPrisma.analyticsAlert.aggregate.mockResolvedValue({
      _count: 1,
      _sum: { conversionValue: 0 },
    });
    mockPrisma.analyticsSearch.findMany.mockResolvedValue([{ userId: "user-1" }]);
    mockPrisma.analyticsSearch.count.mockResolvedValue(3);

    const metrics = await getKPIMetrics(30);

    expect(metrics.cacheHitRate).toBe(30);
    expect(metrics.conversionRate).toBe(20);
    expect(mockPrisma.analyticsSearch.count).toHaveBeenCalledWith({
      where: {
        timestamp: { gte: expect.any(Date) },
        cacheHit: true,
      },
    });
  });

  it("fills missing UTC days with zero while keeping database counts", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-16T12:00:00Z"));
    mockPrisma.$queryRaw.mockResolvedValue([
      { date: "2026-10-14", searches: 4 },
      { date: "2026-10-16", searches: 7 },
    ]);

    try {
      expect(await getDailySearchVolumes(3)).toEqual([
        { date: "2026-10-14", searches: 4 },
        { date: "2026-10-15", searches: 0 },
        { date: "2026-10-16", searches: 7 },
      ]);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});

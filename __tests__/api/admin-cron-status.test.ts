import { GET } from "@/app/api/admin/cron/status/route";
import { NextRequest } from "next/server";

const mockRedisGet = jest.fn();
const mockRateLimitResponse = jest.fn();
const mockHasAdminSecret = jest.fn();
const mockHasAdminSession = jest.fn();
const mockHasCronSecret = jest.fn();
const mockLogError = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: {
    get: (...args: unknown[]) => mockRedisGet(...args),
  },
}));

jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: (...args: unknown[]) => mockRateLimitResponse(...args),
}));

jest.mock("@/lib/auth", () => ({
  hasAdminSecret: (...args: unknown[]) => mockHasAdminSecret(...args),
  hasAdminSession: (...args: unknown[]) => mockHasAdminSession(...args),
  hasCronSecret: (...args: unknown[]) => mockHasCronSecret(...args),
}));

jest.mock("@/lib/logger", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

describe("GET /api/admin/cron/status", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimitResponse.mockResolvedValue(null);
    mockHasAdminSecret.mockReturnValue(true);
    mockHasAdminSession.mockReturnValue(false);
    mockHasCronSecret.mockReturnValue(false);
  });

  it("rejects unauthenticated requests", async () => {
    mockHasAdminSecret.mockReturnValue(false);

    const res = await GET(new NextRequest("http://localhost/api/admin/cron/status"));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.ok).toBe(false);
    expect(mockRedisGet).not.toHaveBeenCalled();
  });

  it("returns last daily run and per-job state", async () => {
    mockRedisGet.mockImplementation(async (key: string) => {
      if (key === "cron:daily:lastRun") {
        return {
          runId: "run-1",
          status: "dispatched",
          startedAt: "2026-09-15T00:00:00.000Z",
          jobs: ["/api/cron/miles-prices"],
        };
      }
      if (key === "cron:daily:runs:run-1:job:api:cron:miles-prices") {
        return {
          runId: "run-1",
          path: "/api/cron/miles-prices",
          status: "accepted",
          statusCode: 200,
          startedAt: "2026-09-15T00:00:00.000Z",
          finishedAt: "2026-09-15T00:00:01.000Z",
        };
      }
      return null;
    });

    const res = await GET(new NextRequest("http://localhost/api/admin/cron/status"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.daily.lastRun.runId).toBe("run-1");
    expect(data.daily.jobs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "/api/cron/miles-prices",
          state: expect.objectContaining({ status: "accepted", statusCode: 200 }),
        }),
      ]),
    );
    expect(data.checkedAt).toEqual(expect.any(String));
  });

  it("returns null states when no daily run exists yet", async () => {
    mockRedisGet.mockResolvedValue(null);

    const res = await GET(new NextRequest("http://localhost/api/admin/cron/status"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.daily.lastRun).toBeNull();
    expect(data.daily.jobs.length).toBeGreaterThan(0);
    expect(data.daily.jobs.every((job: { state: unknown }) => job.state === null)).toBe(true);
  });
});

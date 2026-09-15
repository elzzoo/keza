const mockHasCronSecret = jest.fn();
const mockRateLimitResponse = jest.fn();
const mockRedisSet = jest.fn();
const mockLogWarn = jest.fn();
const mockLogError = jest.fn();

jest.mock("@/lib/auth", () => ({
  hasCronSecret: (...args: unknown[]) => mockHasCronSecret(...args),
}));

jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: (...args: unknown[]) => mockRateLimitResponse(...args),
}));

jest.mock("@/lib/redis", () => ({
  redis: {
    set: (...args: unknown[]) => mockRedisSet(...args),
  },
}));

jest.mock("@/lib/logger", () => ({
  logWarn: (...args: unknown[]) => mockLogWarn(...args),
  logError: (...args: unknown[]) => mockLogError(...args),
}));

import { GET } from "@/app/api/cron/daily/route";

const OLD_ENV = process.env;

describe("GET /api/cron/daily", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...OLD_ENV,
      CRON_SECRET: "test-cron-secret",
      NEXT_PUBLIC_APP_URL: "https://example.com",
    };
    mockHasCronSecret.mockReturnValue(true);
    mockRateLimitResponse.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue("OK");
    global.fetch = jest.fn(async () => new Response("ok", { status: 200 })) as jest.Mock;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("rejects unauthorized requests", async () => {
    mockHasCronSecret.mockReturnValue(false);

    const res = await GET(new Request("http://localhost/api/cron/daily"));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.ok).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns a run id and dispatches all configured jobs", async () => {
    const res = await GET(new Request("http://localhost/api/cron/daily"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.runId).toEqual(expect.any(String));
    expect(data.count).toBe(data.triggered.length);
    expect(data.triggered).toContain("/api/cron/miles-prices");
    expect(data.triggered).toContain("/api/cron/prewarm");
    expect(global.fetch).toHaveBeenCalledTimes(data.triggered.length);
    expect(mockRedisSet).toHaveBeenCalledWith(
      "cron:daily:lastRun",
      expect.objectContaining({ runId: data.runId, status: "dispatched" }),
      expect.objectContaining({ ex: expect.any(Number) }),
    );
  });
});

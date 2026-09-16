import { GET } from "@/app/api/admin/export/redis/route";
import { NextRequest, NextResponse } from "next/server";

const mockRateLimitResponse = jest.fn();
const mockHasAdminSession = jest.fn();
const mockRedisSmembers = jest.fn();
const mockRedisGet = jest.fn();
const mockRedisLrange = jest.fn();
const mockRedisZrange = jest.fn();
const mockRedisKeys = jest.fn();
const mockLogError = jest.fn();
const mockCaptureMessage = jest.fn();

jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: (...args: unknown[]) => mockRateLimitResponse(...args),
}));

jest.mock("@/lib/auth", () => ({
  hasAdminSession: (...args: unknown[]) => mockHasAdminSession(...args),
}));

jest.mock("@/lib/redis", () => ({
  redis: {
    smembers: (...args: unknown[]) => mockRedisSmembers(...args),
    get: (...args: unknown[]) => mockRedisGet(...args),
    lrange: (...args: unknown[]) => mockRedisLrange(...args),
    zrange: (...args: unknown[]) => mockRedisZrange(...args),
    keys: (...args: unknown[]) => mockRedisKeys(...args),
  },
}));

jest.mock("@/lib/logger", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

jest.mock("@sentry/nextjs", () => ({
  captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
}));

describe("GET /api/admin/export/redis", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimitResponse.mockResolvedValue(null);
    mockHasAdminSession.mockReturnValue(true);
    mockRedisSmembers.mockImplementation(async (key: string) => {
      if (key === "keza:alerts:routes") return ["DSS:CDG"];
      if (key === "keza:alerts:route:DSS:CDG") return ["alt_1"];
      if (key === "keza:push:subscriptions") {
        return [JSON.stringify({ endpoint: "https://push.example/global", keys: { p256dh: "p", auth: "a" } })];
      }
      if (key === "keza:push:subs:user@example.com") {
        return [JSON.stringify({ endpoint: "https://push.example/user", keys: { p256dh: "p2", auth: "a2" } })];
      }
      return [];
    });
    mockRedisGet.mockImplementation(async (key: string) => {
      if (key === "keza:alert:alt_1") {
        return { id: "alt_1", email: "user@example.com", active: true };
      }
      if (key === "keza:miles-alert:user@example.com:DSS-CDG:Flying Blue") {
        return { email: "user@example.com", route: "DSS-CDG", program: "Flying Blue", thresholdCpp: 1.2 };
      }
      return null;
    });
    mockRedisLrange.mockResolvedValue([JSON.stringify({ email: "lead@example.com", company: "Acme" })]);
    mockRedisZrange.mockImplementation(async (key: string) => {
      if (key === "keza:pro:waitlist") return ["pro@example.com"];
      if (key === "keza:newsletter:subscribers") return ["news@example.com"];
      return [];
    });
    mockRedisKeys.mockImplementation(async (pattern: string) => {
      if (pattern === "keza:push:subs:*") return ["keza:push:subs:user@example.com"];
      if (pattern === "keza:miles-alert:*") return ["keza:miles-alert:user@example.com:DSS-CDG:Flying Blue"];
      return [];
    });
  });

  it("rejects unauthenticated requests", async () => {
    mockHasAdminSession.mockReturnValue(false);

    const res = await GET(new NextRequest("http://localhost/api/admin/export/redis"));

    expect(res.status).toBe(401);
    expect(mockRedisSmembers).not.toHaveBeenCalled();
  });

  it("returns a JSON backup of critical Redis data", async () => {
    const res = await GET(new NextRequest("http://localhost/api/admin/export/redis"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("content-disposition")).toContain("xalifly-redis-backup-");
    expect(data.formatVersion).toBe(1);
    expect(data.sources.priceAlerts.alerts).toEqual([
      { id: "alt_1", value: { id: "alt_1", email: "user@example.com", active: true } },
    ]);
    expect(data.sources.b2bLeads).toEqual([{ email: "lead@example.com", company: "Acme" }]);
    expect(data.sources.pushSubscriptions.perEmail).toHaveLength(1);
    expect(data.sources.proWaitlist).toEqual(["pro@example.com"]);
    expect(data.sources.newsletterSubscribers).toEqual(["news@example.com"]);
    expect(data.sources.milesAlerts).toEqual([
      {
        key: "keza:miles-alert:user@example.com:DSS-CDG:Flying Blue",
        value: { email: "user@example.com", route: "DSS-CDG", program: "Flying Blue", thresholdCpp: 1.2 },
      },
    ]);
    expect(data.counts).toEqual({
      priceAlerts: 1,
      b2bLeads: 1,
      pushGlobalSubscriptions: 1,
      pushEmailBuckets: 1,
      proWaitlist: 1,
      newsletterSubscribers: 1,
      milesAlerts: 1,
    });
    expect(mockCaptureMessage).toHaveBeenCalledWith("[admin] JSON export: redis critical data", "info");
  });

  it("returns rate limit responses before auth and Redis access", async () => {
    mockRateLimitResponse.mockResolvedValue(
      NextResponse.json({ error: "Too many requests" }, { status: 429 }),
    );

    const res = await GET(new NextRequest("http://localhost/api/admin/export/redis"));

    expect(res.status).toBe(429);
    expect(mockHasAdminSession).not.toHaveBeenCalled();
    expect(mockRedisSmembers).not.toHaveBeenCalled();
  });
});

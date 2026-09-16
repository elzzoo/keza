import { GET } from "@/app/api/cron/redis-backup/route";
import { NextRequest, NextResponse } from "next/server";

const mockHasCronSecret = jest.fn();
const mockRateLimitResponse = jest.fn();
const mockBuildCriticalRedisBackup = jest.fn();
const mockRedisSet = jest.fn();
const mockResendSend = jest.fn();
const mockLogWarn = jest.fn();
const mockLogError = jest.fn();
const mockCaptureMessage = jest.fn();

jest.mock("@/lib/auth", () => ({
  hasCronSecret: (...args: unknown[]) => mockHasCronSecret(...args),
}));

jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: (...args: unknown[]) => mockRateLimitResponse(...args),
}));

jest.mock("@/lib/redisBackup", () => ({
  buildCriticalRedisBackup: (...args: unknown[]) => mockBuildCriticalRedisBackup(...args),
}));

jest.mock("@/lib/redis", () => ({
  redis: {
    set: (...args: unknown[]) => mockRedisSet(...args),
  },
}));

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: (...args: unknown[]) => mockResendSend(...args) },
  })),
}));

jest.mock("@/lib/logger", () => ({
  logWarn: (...args: unknown[]) => mockLogWarn(...args),
  logError: (...args: unknown[]) => mockLogError(...args),
}));

jest.mock("@sentry/nextjs", () => ({
  withMonitor: (_name: string, callback: () => unknown) => callback(),
  captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
}));

const OLD_ENV = process.env;

const backup = {
  exportedAt: "2026-09-16T09:00:00.000Z",
  formatVersion: 1,
  sources: {
    priceAlerts: { routes: [], routeIndexes: [], alerts: [] },
    b2bLeads: [],
    pushSubscriptions: { global: [], perEmail: [] },
    proWaitlist: [],
    newsletterSubscribers: [],
    milesAlerts: [],
  },
  counts: {
    priceAlerts: 2,
    b2bLeads: 1,
    pushGlobalSubscriptions: 0,
    pushEmailBuckets: 0,
    proWaitlist: 3,
    newsletterSubscribers: 4,
    milesAlerts: 5,
  },
};

describe("GET /api/cron/redis-backup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV, CRON_SECRET: "cron-secret", RESEND_API_KEY: "resend-key" };
    delete process.env.ADMIN_BACKUP_EMAIL;
    mockHasCronSecret.mockReturnValue(true);
    mockRateLimitResponse.mockResolvedValue(null);
    mockBuildCriticalRedisBackup.mockResolvedValue(backup);
    mockRedisSet.mockResolvedValue("OK");
    mockResendSend.mockResolvedValue({ data: { id: "email_1" } });
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("rejects unauthorized requests", async () => {
    mockHasCronSecret.mockReturnValue(false);

    const res = await GET(new NextRequest("http://localhost/api/cron/redis-backup"));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.ok).toBe(false);
    expect(mockBuildCriticalRedisBackup).not.toHaveBeenCalled();
  });

  it("returns rate limit responses before auth and backup work", async () => {
    mockRateLimitResponse.mockResolvedValue(
      NextResponse.json({ error: "Too many requests" }, { status: 429 }),
    );

    const res = await GET(new NextRequest("http://localhost/api/cron/redis-backup"));

    expect(res.status).toBe(429);
    expect(mockHasCronSecret).not.toHaveBeenCalled();
    expect(mockBuildCriticalRedisBackup).not.toHaveBeenCalled();
  });

  it("records backup counts and warns when no backup email is configured", async () => {
    const res = await GET(new NextRequest("http://localhost/api/cron/redis-backup"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.emailed).toBe(false);
    expect(data.counts).toEqual(backup.counts);
    expect(mockRedisSet).toHaveBeenCalledWith(
      "keza:backup:redis:last",
      backup.exportedAt,
      expect.objectContaining({ ex: expect.any(Number) }),
    );
    expect(mockRedisSet).toHaveBeenCalledWith(
      "keza:backup:redis:last_counts",
      backup.counts,
      expect.objectContaining({ ex: expect.any(Number) }),
    );
    expect(mockLogWarn).toHaveBeenCalledWith(
      "[api/cron/redis-backup] ADMIN_BACKUP_EMAIL is not configured",
      undefined,
      { counts: backup.counts },
    );
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it("emails the JSON backup when ADMIN_BACKUP_EMAIL is configured", async () => {
    process.env.ADMIN_BACKUP_EMAIL = "ops@example.com";

    const res = await GET(new NextRequest("http://localhost/api/cron/redis-backup"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.emailed).toBe(true);
    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ops@example.com",
        subject: "Xalifly Redis backup — 2026-09-16",
        attachments: [
          expect.objectContaining({
            filename: "xalifly-redis-backup-2026-09-16.json",
            content: expect.any(String),
          }),
        ],
      }),
    );
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      "[cron] Redis backup emailed",
      expect.objectContaining({ level: "info" }),
    );
  });
});

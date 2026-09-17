const mockRedisSet = jest.fn();
const mockResendSend = jest.fn();
const mockLogWarn = jest.fn();
const mockLogError = jest.fn();
const mockCaptureMessage = jest.fn();

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
  captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
}));

import { maybeSendDailyCronHealthAlert } from "@/lib/cronAlerting";
import type { DailyCronStatus } from "@/lib/cronStatus";

function makeStatus(health: DailyCronStatus["health"]): DailyCronStatus {
  return {
    health,
    lastRun: {
      runId: "run-1",
      status: "dispatched",
      startedAt: "2026-09-17T05:00:00.000Z",
      jobs: ["/api/cron/deals"],
    },
    jobs: [
      {
        path: "/api/cron/deals",
        state: {
          runId: "run-1",
          path: "/api/cron/deals",
          status: "rejected",
          statusCode: 500,
          startedAt: "2026-09-17T05:00:00.000Z",
          finishedAt: "2026-09-17T05:00:01.000Z",
        },
      },
    ],
  };
}

describe("maybeSendDailyCronHealthAlert", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, CRON_ALERT_EMAIL: "ops@example.com", RESEND_API_KEY: "re_test" };
    mockRedisSet.mockResolvedValue("OK");
    mockResendSend.mockResolvedValue({ data: { id: "email_1" } });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("does nothing for healthy cron status", async () => {
    const result = await maybeSendDailyCronHealthAlert(makeStatus("ok"));

    expect(result).toEqual({ attempted: false, sent: false, reason: "healthy" });
    expect(mockRedisSet).not.toHaveBeenCalled();
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it("deduplicates stale alerts by health and run id", async () => {
    mockRedisSet.mockResolvedValue(null);

    const result = await maybeSendDailyCronHealthAlert(makeStatus("stale"));

    expect(result).toEqual({ attempted: false, sent: false, reason: "duplicate" });
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it("emails the configured recipient for degraded cron status", async () => {
    const result = await maybeSendDailyCronHealthAlert(makeStatus("degraded"), "api:health");

    expect(result).toEqual({ attempted: true, sent: true });
    expect(mockRedisSet).toHaveBeenCalledWith(
      "cron:daily:alerts:degraded:run-1",
      expect.any(String),
      { ex: 12 * 60 * 60, nx: true },
    );
    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ops@example.com",
        subject: "[Xalifly] Daily cron degraded",
        text: expect.stringContaining("/api/cron/deals (rejected 500)"),
      }),
    );
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      "[cron] Daily cron health alert sent",
      expect.objectContaining({ level: "warning" }),
    );
  });

  it("logs when no alert recipient is configured", async () => {
    delete process.env.CRON_ALERT_EMAIL;
    delete process.env.ADMIN_ALERT_EMAIL;
    delete process.env.ADMIN_BACKUP_EMAIL;

    const result = await maybeSendDailyCronHealthAlert(makeStatus("stale"));

    expect(result).toEqual({ attempted: true, sent: false, reason: "missing_recipient" });
    expect(mockLogWarn).toHaveBeenCalledWith(
      "[cronAlerting] cron health alert recipient is not configured",
      undefined,
      expect.objectContaining({ health: "stale", runId: "run-1" }),
    );
    expect(mockResendSend).not.toHaveBeenCalled();
  });
});

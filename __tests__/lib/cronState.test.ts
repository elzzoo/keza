const mockRedisSet = jest.fn();
const mockLogWarn = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: {
    set: (...args: unknown[]) => mockRedisSet(...args),
  },
}));

jest.mock("@/lib/logger", () => ({
  logWarn: (...args: unknown[]) => mockLogWarn(...args),
}));

import {
  CRON_STATE_TTL_SECONDS,
  cronJobKey,
  cronLastRunKey,
  cronRunKey,
  deriveCronHealth,
  recordCronState,
} from "@/lib/cronState";

describe("cronState", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisSet.mockResolvedValue("OK");
  });

  it("builds stable cron state keys", () => {
    expect(cronLastRunKey("daily")).toBe("cron:daily:lastRun");
    expect(cronRunKey("daily", "run-1")).toBe("cron:daily:runs:run-1");
    expect(cronJobKey("daily", "run-1", "/api/cron/miles-prices")).toBe(
      "cron:daily:runs:run-1:job:api:cron:miles-prices",
    );
  });

  it("records state with the default TTL", async () => {
    await recordCronState("cron:daily:lastRun", {
      runId: "run-1",
      status: "dispatched",
      startedAt: "2026-09-15T00:00:00.000Z",
    });

    expect(mockRedisSet).toHaveBeenCalledWith(
      "cron:daily:lastRun",
      expect.objectContaining({ runId: "run-1", status: "dispatched" }),
      { ex: CRON_STATE_TTL_SECONDS },
    );
  });

  it("logs but does not throw when Redis recording fails", async () => {
    mockRedisSet.mockRejectedValue(new Error("redis down"));

    await expect(recordCronState("cron:daily:lastRun", {
      runId: "run-1",
      status: "failed",
      startedAt: "2026-09-15T00:00:00.000Z",
      error: "boom",
    })).resolves.toBeUndefined();

    expect(mockLogWarn).toHaveBeenCalledWith(
      "[cronState] failed to record state",
      "Error: redis down",
      { key: "cron:daily:lastRun" },
    );
  });

  it("derives cron health from last run and job states", () => {
    const now = new Date("2026-09-15T12:00:00.000Z");
    const freshRun = {
      runId: "run-1",
      status: "dispatched" as const,
      startedAt: "2026-09-15T11:00:00.000Z",
    };

    expect(deriveCronHealth(null, [], { now })).toBe("unknown");
    expect(deriveCronHealth(freshRun, [{ runId: "run-1", path: "/x", status: "accepted", startedAt: freshRun.startedAt }], { now })).toBe("ok");
    expect(deriveCronHealth(freshRun, [null], { now })).toBe("running");
    expect(deriveCronHealth(freshRun, [{ runId: "run-1", path: "/x", status: "rejected", startedAt: freshRun.startedAt }], { now })).toBe("degraded");
    expect(
      deriveCronHealth(
        { ...freshRun, startedAt: "2026-09-14T00:00:00.000Z" },
        [],
        { now },
      ),
    ).toBe("stale");
  });
});

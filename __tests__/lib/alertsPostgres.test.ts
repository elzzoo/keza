const mockUpsert = jest.fn();
const mockLogWarn = jest.fn();
const mockBuildCriticalRedisBackup = jest.fn();

jest.mock("@/lib/db", () => ({
  prisma: {
    priceAlertRecord: {
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
  },
}));

jest.mock("@/lib/logger", () => ({
  logWarn: (...args: unknown[]) => mockLogWarn(...args),
}));

jest.mock("@/lib/redisBackup", () => ({
  buildCriticalRedisBackup: (...args: unknown[]) => mockBuildCriticalRedisBackup(...args),
}));

import {
  backfillPriceAlertsToPostgres,
  isPriceAlertPostgresSyncEnabled,
  isPriceAlertRecord,
  priceAlertToRecordData,
  syncPriceAlertToPostgres,
} from "@/lib/alertsPostgres";
import type { PriceAlert } from "@/lib/alerts";

const OLD_ENV = process.env;

const alert: PriceAlert = {
  id: "alt_123",
  email: "user@example.com",
  from: "DSS",
  to: "CDG",
  cabin: "economy",
  basePrice: 800,
  targetPrice: 720,
  createdAt: "2026-09-16T10:00:00.000Z",
  lastCheckedAt: "2026-09-16T11:00:00.000Z",
  lastPrice: 710,
  notifCount: 1,
  active: true,
  notifFrequency: "instant",
  milesAlert: {
    program: "Flying Blue",
    targetCpp: 1.4,
    baseCpp: 1.1,
  },
};

describe("alertsPostgres", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV };
    delete process.env.PRICE_ALERTS_POSTGRES_SYNC;
    mockUpsert.mockResolvedValue({});
    mockBuildCriticalRedisBackup.mockResolvedValue({
      sources: {
        priceAlerts: {
          alerts: [
            { id: "alt_123", value: alert },
            { id: "bad", value: { nope: true } },
          ],
        },
      },
    });
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("keeps Postgres sync disabled by default", () => {
    expect(isPriceAlertPostgresSyncEnabled()).toBe(false);
  });

  it("maps PriceAlert to the durable record shape", () => {
    const data = priceAlertToRecordData(alert);

    expect(data).toEqual(
      expect.objectContaining({
        id: "alt_123",
        email: "user@example.com",
        routeFrom: "DSS",
        routeTo: "CDG",
        cabin: "economy",
        basePrice: 800,
        targetPrice: 720,
        lastPrice: 710,
        notifCount: 1,
        active: true,
        notifFrequency: "instant",
        milesProgram: "Flying Blue",
        milesTargetCpp: 1.4,
        milesBaseCpp: 1.1,
      }),
    );
    expect(data.createdAt).toEqual(new Date("2026-09-16T10:00:00.000Z"));
    expect(data.lastCheckedAt).toEqual(new Date("2026-09-16T11:00:00.000Z"));
    expect(data.rawJson).toEqual(alert);
  });

  it("identifies valid Redis price alert payloads", () => {
    expect(isPriceAlertRecord(alert)).toBe(true);
    expect(isPriceAlertRecord({ ...alert, targetPrice: "720" })).toBe(false);
    expect(isPriceAlertRecord(null)).toBe(false);
  });

  it("does nothing while sync flag is disabled", async () => {
    await expect(syncPriceAlertToPostgres(alert)).resolves.toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("upserts the alert when sync flag is enabled", async () => {
    process.env.PRICE_ALERTS_POSTGRES_SYNC = "1";

    await expect(syncPriceAlertToPostgres(alert)).resolves.toBe(true);

    expect(mockUpsert).toHaveBeenCalledWith({
      where: { id: "alt_123" },
      update: expect.objectContaining({ id: "alt_123", active: true }),
      create: expect.objectContaining({ id: "alt_123", active: true }),
    });
  });

  it("logs and returns false when the upsert fails", async () => {
    process.env.PRICE_ALERTS_POSTGRES_SYNC = "1";
    mockUpsert.mockRejectedValue(new Error("missing table"));

    await expect(syncPriceAlertToPostgres(alert)).resolves.toBe(false);

    expect(mockLogWarn).toHaveBeenCalledWith("[alertsPostgres] sync failed", "missing table", {
      alertId: "alt_123",
    });
  });

  it("dry-runs a Redis to Postgres backfill without writing", async () => {
    await expect(backfillPriceAlertsToPostgres()).resolves.toEqual({
      dryRun: true,
      scanned: 2,
      valid: 1,
      upserted: 0,
      failed: 0,
    });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("backfills valid Redis alerts when dryRun is false", async () => {
    await expect(backfillPriceAlertsToPostgres({ dryRun: false })).resolves.toEqual({
      dryRun: false,
      scanned: 2,
      valid: 1,
      upserted: 1,
      failed: 0,
    });
    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });
});

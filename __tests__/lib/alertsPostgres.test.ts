const mockUpsert = jest.fn();
const mockLogWarn = jest.fn();

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

import {
  isPriceAlertPostgresSyncEnabled,
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
});

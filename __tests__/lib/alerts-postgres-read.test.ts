const mockRedisGet = jest.fn();
const mockRedisSmembers = jest.fn();
const mockLogError = jest.fn();

const mockGetActiveByEmail = jest.fn();
const mockGetById = jest.fn();
const mockGetActiveByRoute = jest.fn();
const mockGetAllRoutes = jest.fn();
const mockGetGroupedByEmail = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: {
    get: (...args: unknown[]) => mockRedisGet(...args),
    set: jest.fn(),
    smembers: (...args: unknown[]) => mockRedisSmembers(...args),
    sadd: jest.fn(),
    srem: jest.fn(),
    expire: jest.fn(),
  },
}));

jest.mock("@/lib/logger", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

jest.mock("@/lib/alertsPostgres", () => ({
  getActivePriceAlertsByEmailFromPostgres: (...args: unknown[]) => mockGetActiveByEmail(...args),
  getPriceAlertByIdFromPostgres: (...args: unknown[]) => mockGetById(...args),
  getActivePriceAlertsByRouteFromPostgres: (...args: unknown[]) => mockGetActiveByRoute(...args),
  getAllActivePriceAlertRoutesFromPostgres: (...args: unknown[]) => mockGetAllRoutes(...args),
  getAllActivePriceAlertsByEmailFromPostgres: (...args: unknown[]) => mockGetGroupedByEmail(...args),
}));

jest.mock("resend", () => ({
  Resend: jest.fn(() => ({ emails: { send: jest.fn() } })),
}));

jest.mock("@/lib/alertTokens", () => ({
  createManageAlertsToken: jest.fn(() => "manage-token"),
  createUnsubscribeAlertToken: jest.fn(() => "unsubscribe-token"),
}));

import {
  getAlertById,
  getAlertsByEmail,
  getAlertsByRoute,
  getAllActiveAlertsByEmail,
  getAllActiveRoutes,
  type PriceAlert,
} from "@/lib/alerts";

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
  notifCount: 0,
  active: true,
  notifFrequency: "instant",
};

describe("alerts Postgres-first reads", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV, PRICE_ALERTS_POSTGRES_SYNC: "1" };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("reads active alerts by email from Postgres when sync is enabled", async () => {
    mockGetActiveByEmail.mockResolvedValue([alert]);

    await expect(getAlertsByEmail("user@example.com")).resolves.toEqual([alert]);

    expect(mockGetActiveByEmail).toHaveBeenCalledWith("user@example.com");
    expect(mockRedisSmembers).not.toHaveBeenCalled();
  });

  it("falls back to Redis when a Postgres read fails", async () => {
    mockGetActiveByEmail.mockRejectedValue(new Error("db down"));
    mockRedisSmembers.mockResolvedValue(["alt_123"]);
    mockRedisGet.mockResolvedValue(alert);

    await expect(getAlertsByEmail("user@example.com")).resolves.toEqual([alert]);

    expect(mockRedisSmembers).toHaveBeenCalledWith("keza:alerts:email:user@example.com");
    expect(mockRedisGet).toHaveBeenCalledWith("keza:alert:alt_123");
    expect(mockLogError).toHaveBeenCalledWith(
      "[alerts] postgres read failed (getAlertsByEmail), falling back to Redis",
      expect.any(Error)
    );
  });

  it("keeps Redis reads when the sync flag is disabled", async () => {
    delete process.env.PRICE_ALERTS_POSTGRES_SYNC;
    mockRedisSmembers.mockResolvedValue(["alt_123"]);
    mockRedisGet.mockResolvedValue(alert);

    await expect(getAlertsByRoute("DSS", "CDG")).resolves.toEqual([alert]);

    expect(mockGetActiveByRoute).not.toHaveBeenCalled();
    expect(mockRedisSmembers).toHaveBeenCalledWith("keza:alerts:route:DSS:CDG");
  });

  it("routes id, route-list, and grouped reads through Postgres", async () => {
    const grouped = new Map([["user@example.com", [alert]]]);
    mockGetById.mockResolvedValue(alert);
    mockGetAllRoutes.mockResolvedValue(["DSS:CDG"]);
    mockGetGroupedByEmail.mockResolvedValue(grouped);

    await expect(getAlertById("alt_123")).resolves.toEqual(alert);
    await expect(getAllActiveRoutes()).resolves.toEqual(["DSS:CDG"]);
    await expect(getAllActiveAlertsByEmail()).resolves.toBe(grouped);

    expect(mockGetById).toHaveBeenCalledWith("alt_123");
    expect(mockGetAllRoutes).toHaveBeenCalledTimes(1);
    expect(mockGetGroupedByEmail).toHaveBeenCalledTimes(1);
  });
});

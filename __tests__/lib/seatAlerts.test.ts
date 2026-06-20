// __tests__/lib/seatAlerts.test.ts
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisDel = jest.fn();
const mockRedisSadd = jest.fn();
const mockRedisSmembers = jest.fn();
const mockRedisSrem = jest.fn();
const mockRedisMget = jest.fn();

jest.mock("@upstash/redis", () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: mockRedisGet,
    set: mockRedisSet,
    del: mockRedisDel,
    sadd: mockRedisSadd,
    smembers: mockRedisSmembers,
    srem: mockRedisSrem,
    mget: mockRedisMget,
  })),
}));

jest.mock("@/lib/logger", () => ({
  logRedisError: jest.fn(),
}));

// Must import after mocks
import {
  SeatAlertSubscription,
  validateSeatAlert,
  saveSeatAlert,
  getSeatAlert,
  getAllAlertsForEmail,
  deleteSeatAlert,
} from "@/lib/seatAlerts";

beforeEach(() => {
  jest.clearAllMocks();
  process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test_token";
});

describe("SeatAlertSubscription schema", () => {
  it("creates valid seat alert with all required fields", () => {
    const alert: SeatAlertSubscription = {
      email: "user@example.com",
      route: "SIN-LAX",
      cabin: "BUSINESS",
      minPrice: 5000,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    };
    expect(validateSeatAlert(alert)).toBe(true);
  });

  it("rejects alert with invalid cabin", () => {
    const invalid = {
      email: "user@example.com",
      route: "SIN-LAX",
      cabin: "INVALID_CABIN",
      minPrice: 5000,
    };
    expect(validateSeatAlert(invalid)).toBe(false);
  });

  it("rejects alert with missing required fields", () => {
    const incomplete = { email: "user@example.com", cabin: "BUSINESS" };
    expect(validateSeatAlert(incomplete)).toBe(false);
  });
});

describe("SeatAlert Redis storage", () => {
  const testAlert: SeatAlertSubscription = {
    email: "test@example.com",
    route: "SIN-LAX",
    cabin: "BUSINESS",
    minPrice: 5000,
    createdAt: new Date("2026-01-01"),
    expiresAt: new Date("2026-04-01"),
  };

  it("saves and retrieves seat alert", async () => {
    mockRedisSet.mockResolvedValueOnce("OK");
    mockRedisSadd.mockResolvedValueOnce(1);
    mockRedisGet.mockResolvedValueOnce(JSON.stringify(testAlert));

    await saveSeatAlert(testAlert);
    const retrieved = await getSeatAlert(testAlert.email, testAlert.route, testAlert.cabin);

    expect(retrieved).toMatchObject({
      email: "test@example.com",
      route: "SIN-LAX",
      cabin: "BUSINESS",
    });
  });

  it("lists all alerts for email", async () => {
    const testAlert2 = {
      ...testAlert,
      route: "NRT-LAX",
      cabin: "PREMIUM_ECONOMY" as const,
    };

    mockRedisSet.mockResolvedValue("OK");
    mockRedisSadd.mockResolvedValue(1);
    mockRedisSmembers.mockResolvedValueOnce([
      "SIN-LAX:BUSINESS",
      "NRT-LAX:PREMIUM_ECONOMY",
    ]);
    mockRedisMget.mockResolvedValueOnce([
      JSON.stringify(testAlert),
      JSON.stringify(testAlert2),
    ]);

    await saveSeatAlert(testAlert);
    await saveSeatAlert(testAlert2);
    const alerts = await getAllAlertsForEmail("test@example.com");

    expect(alerts).toHaveLength(2);
  });

  it("deletes alert", async () => {
    mockRedisSet.mockResolvedValueOnce("OK");
    mockRedisSadd.mockResolvedValue(1);
    mockRedisDel.mockResolvedValueOnce(1);
    mockRedisSrem.mockResolvedValue(1);
    mockRedisGet.mockResolvedValueOnce(null);
    mockRedisGet.mockResolvedValueOnce(null);

    await saveSeatAlert(testAlert);
    await deleteSeatAlert(testAlert.email, testAlert.route, testAlert.cabin);
    const retrieved = await getSeatAlert(testAlert.email, testAlert.route, testAlert.cabin);

    expect(retrieved).toBeNull();
  });

  it("returns null for corrupted JSON", async () => {
    mockRedisGet.mockResolvedValueOnce("{ invalid json");

    const result = await getSeatAlert("test@example.com", "SIN-LAX", "BUSINESS");
    expect(result).toBeNull();
  });
});

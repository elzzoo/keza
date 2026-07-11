// __tests__/lib/alerts/alertsService.test.ts

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockDel = jest.fn();
const mockKeys = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: {
    get: (...args: unknown[]) => mockGet(...args),
    set: (...args: unknown[]) => mockSet(...args),
    del: (...args: unknown[]) => mockDel(...args),
    keys: (...args: unknown[]) => mockKeys(...args),
  },
}));

import { createAlert, getAlerts, deleteAlert, type UserAlert } from "@/lib/alerts/alertsService";

describe("Alerts Service", () => {
  const testUserId = "user-123";
  const testAlert = {
    from: "SIN",
    to: "LAX",
    priceThreshold: 1500,
    userId: testUserId,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createAlert", () => {
    it("creates an alert and stores in Redis", async () => {
      mockSet.mockResolvedValue("OK");

      const alert = await createAlert(testAlert);

      expect(alert.id).toBeDefined();
      expect(alert.userId).toBe(testUserId);
      expect(alert.from).toBe("SIN");
      expect(alert.to).toBe("LAX");
      expect(alert.priceThreshold).toBe(1500);
      expect(alert.active).toBe(true);
      expect(alert.createdAt).toBeInstanceOf(Date);
    });

    it("stores alert in Redis with correct key format", async () => {
      mockSet.mockResolvedValue("OK");

      const alert = await createAlert(testAlert);

      expect(mockSet).toHaveBeenCalled();
      const callArgs = mockSet.mock.calls[0];
      const key = callArgs[0] as string;
      expect(key).toMatch(/^alert:user-123:SIN-LAX:/);
    });

    it("sets 90 day TTL on Redis key", async () => {
      mockSet.mockResolvedValue("OK");

      await createAlert(testAlert);

      expect(mockSet).toHaveBeenCalled();
      const callArgs = mockSet.mock.calls[0];
      const options = callArgs[2] as { ex?: number };
      expect(options.ex).toBe(90 * 24 * 60 * 60); // 90 days in seconds
    });

    it("stores alert as JSON in Redis", async () => {
      mockSet.mockResolvedValue("OK");

      const alert = await createAlert(testAlert);

      expect(mockSet).toHaveBeenCalled();
      const callArgs = mockSet.mock.calls[0];
      const value = callArgs[1] as string;
      const parsed = JSON.parse(value);
      expect(parsed.id).toBe(alert.id);
      expect(parsed.userId).toBe(testUserId);
    });
  });

  describe("getAlerts", () => {
    it("retrieves all alerts for a user", async () => {
      const alert1: UserAlert = {
        id: "alt_1",
        userId: testUserId,
        from: "SIN",
        to: "LAX",
        priceThreshold: 1500,
        createdAt: new Date(),
        active: true,
      };

      const alert2: UserAlert = {
        id: "alt_2",
        userId: testUserId,
        from: "CDG",
        to: "JFK",
        priceThreshold: 2000,
        createdAt: new Date(),
        active: true,
      };

      mockKeys.mockResolvedValue([
        `alert:${testUserId}:SIN-LAX:alt_1`,
        `alert:${testUserId}:CDG-JFK:alt_2`,
      ]);

      mockGet.mockImplementation((key: string) => {
        if (key === `alert:${testUserId}:SIN-LAX:alt_1`) return Promise.resolve(JSON.stringify(alert1));
        if (key === `alert:${testUserId}:CDG-JFK:alt_2`) return Promise.resolve(JSON.stringify(alert2));
        return Promise.resolve(null);
      });

      const alerts = await getAlerts(testUserId);

      expect(alerts).toHaveLength(2);
      expect(alerts[0].id).toBe("alt_1");
      expect(alerts[1].id).toBe("alt_2");
    });

    it("uses correct Redis pattern for user alerts", async () => {
      mockKeys.mockResolvedValue([]);
      mockGet.mockResolvedValue(null);

      await getAlerts(testUserId);

      expect(mockKeys).toHaveBeenCalledWith(`alert:${testUserId}:*`);
    });

    it("returns empty array when user has no alerts", async () => {
      mockKeys.mockResolvedValue([]);

      const alerts = await getAlerts(testUserId);

      expect(alerts).toEqual([]);
    });
  });

  describe("deleteAlert", () => {
    it("deletes alert from Redis", async () => {
      const alertId = "alt_123";
      mockKeys.mockResolvedValue([`alert:${testUserId}:SIN-LAX:${alertId}`]);
      mockDel.mockResolvedValue(1);

      await deleteAlert(testUserId, alertId);

      expect(mockDel).toHaveBeenCalled();
      const callArgs = mockDel.mock.calls[0];
      expect(callArgs[0]).toBe(`alert:${testUserId}:SIN-LAX:${alertId}`);
    });

    it("uses correct Redis pattern to find alert key", async () => {
      const alertId = "alt_123";
      mockKeys.mockResolvedValue([]);

      await deleteAlert(testUserId, alertId);

      expect(mockKeys).toHaveBeenCalledWith(`alert:${testUserId}:*:${alertId}`);
    });

    it("handles case where alert does not exist", async () => {
      mockKeys.mockResolvedValue([]);

      await expect(deleteAlert(testUserId, "nonexistent")).resolves.not.toThrow();
      expect(mockDel).not.toHaveBeenCalled();
    });
  });
});

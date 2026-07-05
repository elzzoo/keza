const mockGet = jest.fn();
const mockSet = jest.fn();
const mockDel = jest.fn();
const mockKeys = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: {
    get: mockGet,
    set: mockSet,
    del: mockDel,
    keys: mockKeys,
  },
}));

jest.mock("@/lib/logger");

import {
  createMilesAlert,
  getMilesAlertsByEmail,
  deactivateMilesAlert,
  shouldFireAlert,
  updateAlertLastFired,
  MilesAlert,
} from "@/lib/miles-alerts";

describe("miles-alerts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createMilesAlert", () => {
    it("creates a new miles alert with generated createdAt timestamp", async () => {
      const alert = {
        email: "user@example.com",
        route: "SIN-LAX",
        program: "Singapore KrisFlyer",
        thresholdCpp: 0.8,
      };

      const beforeCreate = Date.now();
      await createMilesAlert(alert);
      const afterCreate = Date.now();

      expect(mockSet).toHaveBeenCalled();
      const [key, value, options] = mockSet.mock.calls[0];

      // Verify key format
      expect(key).toBe("keza:miles-alert:user@example.com:SIN-LAX:Singapore KrisFlyer");

      // Verify stored data
      expect(value).toHaveProperty("email", "user@example.com");
      expect(value).toHaveProperty("route", "SIN-LAX");
      expect(value).toHaveProperty("program", "Singapore KrisFlyer");
      expect(value).toHaveProperty("thresholdCpp", 0.8);
      expect(value).toHaveProperty("createdAt");
      expect(value.createdAt).toBeGreaterThanOrEqual(beforeCreate);
      expect(value.createdAt).toBeLessThanOrEqual(afterCreate);

      // Verify TTL (1 year = 365 days in seconds)
      expect(options).toEqual({ ex: 365 * 24 * 60 * 60 });
    });

    it("stores lastFiredAt as undefined when not provided", async () => {
      const alert = {
        email: "user@example.com",
        route: "SIN-LAX",
        program: "Singapore KrisFlyer",
        thresholdCpp: 0.8,
      };

      await createMilesAlert(alert);

      const [, value] = mockSet.mock.calls[0];
      expect(value).not.toHaveProperty("lastFiredAt");
    });
  });

  describe("getMilesAlertsByEmail", () => {
    it("returns all alerts for a given email", async () => {
      const email = "user@example.com";
      const alerts = [
        {
          email,
          route: "SIN-LAX",
          program: "Singapore KrisFlyer",
          thresholdCpp: 0.8,
          createdAt: 1000,
        },
        {
          email,
          route: "LAX-NRT",
          program: "JAL Mileage Bank",
          thresholdCpp: 1.0,
          createdAt: 2000,
        },
      ];

      // Mock keys to return matching alert keys
      mockKeys.mockResolvedValue([
        `keza:miles-alert:${email}:SIN-LAX:Singapore KrisFlyer`,
        `keza:miles-alert:${email}:LAX-NRT:JAL Mileage Bank`,
      ]);

      // Mock get calls
      mockGet
        .mockResolvedValueOnce(alerts[0])
        .mockResolvedValueOnce(alerts[1]);

      const result = await getMilesAlertsByEmail(email);

      expect(result).toHaveLength(2);
      expect(result).toEqual(alerts);
      expect(mockKeys).toHaveBeenCalledWith(`keza:miles-alert:${email}:*`);
    });

    it("returns empty array when no alerts exist for email", async () => {
      mockKeys.mockResolvedValue([]);

      const result = await getMilesAlertsByEmail("nonexistent@example.com");

      expect(result).toEqual([]);
      expect(mockGet).not.toHaveBeenCalled();
    });

    it("filters out null alerts when Redis returns missing keys", async () => {
      const email = "user@example.com";
      const alert = {
        email,
        route: "SIN-LAX",
        program: "Singapore KrisFlyer",
        thresholdCpp: 0.8,
        createdAt: 1000,
      };

      mockKeys.mockResolvedValue([
        `keza:miles-alert:${email}:SIN-LAX:Singapore KrisFlyer`,
        `keza:miles-alert:${email}:DELETED:Program`,
      ]);

      mockGet
        .mockResolvedValueOnce(alert)
        .mockResolvedValueOnce(null);

      const result = await getMilesAlertsByEmail(email);

      expect(result).toEqual([alert]);
      expect(result).toHaveLength(1);
    });
  });

  describe("deactivateMilesAlert", () => {
    it("deletes an alert by key", async () => {
      const alertKey = "keza:miles-alert:user@example.com:SIN-LAX:Singapore KrisFlyer";

      await deactivateMilesAlert(alertKey);

      expect(mockDel).toHaveBeenCalledWith(alertKey);
    });

    it("can delete multiple alerts", async () => {
      const key1 = "keza:miles-alert:user@example.com:SIN-LAX:Singapore KrisFlyer";
      const key2 = "keza:miles-alert:user@example.com:LAX-NRT:JAL Mileage Bank";

      await deactivateMilesAlert(key1);
      await deactivateMilesAlert(key2);

      expect(mockDel).toHaveBeenCalledTimes(2);
      expect(mockDel).toHaveBeenNthCalledWith(1, key1);
      expect(mockDel).toHaveBeenNthCalledWith(2, key2);
    });
  });

  describe("shouldFireAlert", () => {
    it("returns true when alert has never been fired", async () => {
      const alert: MilesAlert = {
        email: "user@example.com",
        route: "SIN-LAX",
        program: "Singapore KrisFlyer",
        thresholdCpp: 0.8,
        createdAt: 1000,
      };

      const result = await shouldFireAlert(alert, 2000);

      expect(result).toBe(true);
    });

    it("returns false when alert was fired less than 24 hours ago", async () => {
      const now = Date.now();
      const alert: MilesAlert = {
        email: "user@example.com",
        route: "SIN-LAX",
        program: "Singapore KrisFlyer",
        thresholdCpp: 0.8,
        createdAt: now - 48 * 60 * 60 * 1000,
        lastFiredAt: now - 12 * 60 * 60 * 1000, // 12 hours ago
      };

      const result = await shouldFireAlert(alert, now);

      expect(result).toBe(false);
    });

    it("returns true when alert was fired more than 24 hours ago", async () => {
      const now = Date.now();
      const alert: MilesAlert = {
        email: "user@example.com",
        route: "SIN-LAX",
        program: "Singapore KrisFlyer",
        thresholdCpp: 0.8,
        createdAt: now - 100 * 60 * 60 * 1000,
        lastFiredAt: now - 25 * 60 * 60 * 1000, // 25 hours ago
      };

      const result = await shouldFireAlert(alert, now);

      expect(result).toBe(true);
    });

    it("returns true when exactly 24 hours have passed since lastFiredAt", async () => {
      const now = Date.now();
      const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
      const alert: MilesAlert = {
        email: "user@example.com",
        route: "SIN-LAX",
        program: "Singapore KrisFlyer",
        thresholdCpp: 0.8,
        createdAt: now - 100 * 60 * 60 * 1000,
        lastFiredAt: now - twentyFourHoursInMs,
      };

      const result = await shouldFireAlert(alert, now);

      expect(result).toBe(true);
    });

    it("returns false when less than 24 hours have passed (edge case: 23:59)", async () => {
      const now = Date.now();
      const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
      const alert: MilesAlert = {
        email: "user@example.com",
        route: "SIN-LAX",
        program: "Singapore KrisFlyer",
        thresholdCpp: 0.8,
        createdAt: now - 100 * 60 * 60 * 1000,
        lastFiredAt: now - twentyFourHoursInMs + 1000, // 23:59:59
      };

      const result = await shouldFireAlert(alert, now);

      expect(result).toBe(false);
    });
  });

  describe("updateAlertLastFired", () => {
    it("updates the lastFiredAt timestamp for an alert", async () => {
      const email = "user@example.com";
      const route = "SIN-LAX";
      const program = "Singapore KrisFlyer";
      const now = Date.now();

      const existingAlert: MilesAlert = {
        email,
        route,
        program,
        thresholdCpp: 0.8,
        createdAt: 1000,
      };

      mockGet.mockResolvedValue(existingAlert);

      await updateAlertLastFired(email, route, program, now);

      const key = `keza:miles-alert:${email}:${route}:${program}`;
      expect(mockGet).toHaveBeenCalledWith(key);

      const [updateKey, updatedAlert, options] = mockSet.mock.calls[0];
      expect(updateKey).toBe(key);
      expect(updatedAlert).toEqual({
        ...existingAlert,
        lastFiredAt: now,
      });
      expect(options).toEqual({ ex: 365 * 24 * 60 * 60 });
    });

    it("preserves existing lastFiredAt if alert already has one", async () => {
      const email = "user@example.com";
      const route = "SIN-LAX";
      const program = "Singapore KrisFlyer";
      const oldFiredAt = 5000;
      const newFiredAt = 6000;

      const existingAlert: MilesAlert = {
        email,
        route,
        program,
        thresholdCpp: 0.8,
        createdAt: 1000,
        lastFiredAt: oldFiredAt,
      };

      mockGet.mockResolvedValue(existingAlert);

      await updateAlertLastFired(email, route, program, newFiredAt);

      const [, updatedAlert] = mockSet.mock.calls[0];
      expect(updatedAlert.lastFiredAt).toBe(newFiredAt);
    });

    it("handles alert not found gracefully", async () => {
      mockGet.mockResolvedValue(null);

      const email = "user@example.com";
      const route = "SIN-LAX";
      const program = "Singapore KrisFlyer";
      const now = Date.now();

      // Should not throw, just return early or handle gracefully
      await updateAlertLastFired(email, route, program, now);

      const key = `keza:miles-alert:${email}:${route}:${program}`;
      expect(mockGet).toHaveBeenCalledWith(key);
      // mockSet should not be called if alert doesn't exist
      expect(mockSet).not.toHaveBeenCalled();
    });
  });
});

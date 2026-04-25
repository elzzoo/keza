// __tests__/lib/alerts-frequency.test.ts

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockSmembers = jest.fn();
const mockSadd = jest.fn();
const mockSrem = jest.fn();
const mockExpire = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: {
    get: (...args: unknown[]) => mockGet(...args),
    set: (...args: unknown[]) => mockSet(...args),
    smembers: (...args: unknown[]) => mockSmembers(...args),
    sadd: (...args: unknown[]) => mockSadd(...args),
    srem: (...args: unknown[]) => mockSrem(...args),
    expire: (...args: unknown[]) => mockExpire(...args),
  },
}));

const mockEmailsSend = jest.fn();
jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockEmailsSend },
  })),
}));

jest.mock("@/lib/alertTokens", () => ({
  createManageAlertsToken: jest.fn().mockReturnValue("mock-manage-token"),
  createUnsubscribeAlertToken: jest.fn().mockReturnValue("mock-unsub-token"),
}));

import {
  updateAlertFrequency,
  getAllActiveAlertsByEmail,
  sendDigestEmail,
  type PriceAlert,
} from "@/lib/alerts";

function makeMockAlert(overrides: Partial<PriceAlert> = {}): PriceAlert {
  return {
    id: "alt_test123",
    email: "user@example.com",
    from: "DSS",
    to: "CDG",
    cabin: "economy",
    basePrice: 500,
    targetPrice: 450,
    createdAt: new Date().toISOString(),
    notifCount: 0,
    active: true,
    notifFrequency: "instant",
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.RESEND_API_KEY = "re_test_key";
  mockEmailsSend.mockResolvedValue({ id: "email_mock" });
});

// ─── updateAlertFrequency ────────────────────────────────────────────────────

describe("updateAlertFrequency", () => {
  it("updates notifFrequency and saves back to Redis", async () => {
    const alert = makeMockAlert({ notifFrequency: "instant" });
    mockGet.mockResolvedValue(alert);
    mockSet.mockResolvedValue("OK");

    const result = await updateAlertFrequency("alt_test123", "daily");

    expect(result).toBe(true);
    expect(mockGet).toHaveBeenCalledWith("keza:alert:alt_test123");
    expect(mockSet).toHaveBeenCalledTimes(1);
    const savedAlert = mockSet.mock.calls[0][1] as PriceAlert;
    expect(savedAlert.notifFrequency).toBe("daily");
  });

  it("returns false when alert not found", async () => {
    mockGet.mockResolvedValue(null);

    const result = await updateAlertFrequency("nonexistent_id", "weekly");

    expect(result).toBe(false);
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("can update to all three frequency values", async () => {
    for (const freq of ["instant", "daily", "weekly"] as const) {
      const alert = makeMockAlert({ id: `alt_${freq}` });
      mockGet.mockResolvedValue(alert);
      mockSet.mockResolvedValue("OK");

      const result = await updateAlertFrequency(`alt_${freq}`, freq);
      expect(result).toBe(true);

      const savedAlert = mockSet.mock.calls[mockSet.mock.calls.length - 1][1] as PriceAlert;
      expect(savedAlert.notifFrequency).toBe(freq);
    }
  });
});

// ─── getAllActiveAlertsByEmail ───────────────────────────────────────────────

describe("getAllActiveAlertsByEmail", () => {
  it("groups active alerts by email", async () => {
    const alert1 = makeMockAlert({ id: "alt_1", email: "alice@example.com", from: "DSS", to: "CDG" });
    const alert2 = makeMockAlert({ id: "alt_2", email: "bob@example.com", from: "CDG", to: "JFK" });
    const alert3 = makeMockAlert({ id: "alt_3", email: "alice@example.com", from: "CDG", to: "JFK" });

    // ALL_ROUTES_KEY returns two routes
    mockSmembers.mockImplementation((key: string) => {
      if (key === "keza:alerts:routes") return Promise.resolve(["DSS:CDG", "CDG:JFK"]);
      if (key === "keza:alerts:route:DSS:CDG") return Promise.resolve(["alt_1"]);
      if (key === "keza:alerts:route:CDG:JFK") return Promise.resolve(["alt_2", "alt_3"]);
      return Promise.resolve([]);
    });

    mockGet.mockImplementation((key: string) => {
      if (key === "keza:alert:alt_1") return Promise.resolve(alert1);
      if (key === "keza:alert:alt_2") return Promise.resolve(alert2);
      if (key === "keza:alert:alt_3") return Promise.resolve(alert3);
      return Promise.resolve(null);
    });

    const result = await getAllActiveAlertsByEmail();

    expect(result.size).toBe(2);
    expect(result.get("alice@example.com")).toHaveLength(2);
    expect(result.get("bob@example.com")).toHaveLength(1);
  });

  it("excludes inactive alerts", async () => {
    const active = makeMockAlert({ id: "alt_active", active: true });
    const inactive = makeMockAlert({ id: "alt_inactive", active: false });

    mockSmembers.mockImplementation((key: string) => {
      if (key === "keza:alerts:routes") return Promise.resolve(["DSS:CDG"]);
      if (key === "keza:alerts:route:DSS:CDG") return Promise.resolve(["alt_active", "alt_inactive"]);
      return Promise.resolve([]);
    });

    mockGet.mockImplementation((key: string) => {
      if (key === "keza:alert:alt_active") return Promise.resolve(active);
      if (key === "keza:alert:alt_inactive") return Promise.resolve(inactive);
      return Promise.resolve(null);
    });

    const result = await getAllActiveAlertsByEmail();

    const userAlerts = result.get("user@example.com") ?? [];
    expect(userAlerts).toHaveLength(1);
    expect(userAlerts[0].id).toBe("alt_active");
  });

  it("returns empty map when no routes", async () => {
    mockSmembers.mockResolvedValue([]);

    const result = await getAllActiveAlertsByEmail();
    expect(result.size).toBe(0);
  });
});

// ─── sendDigestEmail ────────────────────────────────────────────────────────

describe("sendDigestEmail", () => {
  it("sends email via Resend with correct subject for single route", async () => {
    const alert = makeMockAlert();
    const items = [{ alert, currentPrice: 420 }];

    const result = await sendDigestEmail("user@example.com", items);

    expect(result).toBe(true);
    expect(mockEmailsSend).toHaveBeenCalledTimes(1);
    const callArgs = mockEmailsSend.mock.calls[0][0];
    expect(callArgs.to).toBe("user@example.com");
    expect(callArgs.subject).toContain("1 route surveillée");
    expect(callArgs.html).toContain("DSS");
    expect(callArgs.html).toContain("CDG");
    expect(callArgs.html).toContain("$420");
    expect(callArgs.html).toContain("$450"); // targetPrice
  });

  it("sends email with plural subject for multiple routes", async () => {
    const alert1 = makeMockAlert({ id: "alt_1", from: "DSS", to: "CDG" });
    const alert2 = makeMockAlert({ id: "alt_2", from: "CDG", to: "JFK" });
    const items = [
      { alert: alert1, currentPrice: 420 },
      { alert: alert2, currentPrice: 650 },
    ];

    await sendDigestEmail("user@example.com", items);

    const callArgs = mockEmailsSend.mock.calls[0][0];
    expect(callArgs.subject).toContain("2 routes surveillées");
  });

  it("returns false when items array is empty", async () => {
    const result = await sendDigestEmail("user@example.com", []);

    expect(result).toBe(false);
    expect(mockEmailsSend).not.toHaveBeenCalled();
  });

  it("returns false when Resend throws", async () => {
    const alert = makeMockAlert();
    mockEmailsSend.mockRejectedValue(new Error("Resend API error"));

    const result = await sendDigestEmail("user@example.com", [{ alert, currentPrice: 420 }]);

    expect(result).toBe(false);
  });

  it("includes open pixel in HTML", async () => {
    const alert = makeMockAlert();
    await sendDigestEmail("user@example.com", [{ alert, currentPrice: 420 }]);

    const callArgs = mockEmailsSend.mock.calls[0][0];
    expect(callArgs.html).toContain("api/track/open");
    expect(callArgs.html).toContain("digest");
  });

  it("colors price green when below target", async () => {
    const alert = makeMockAlert({ targetPrice: 500 });
    await sendDigestEmail("user@example.com", [{ alert, currentPrice: 400 }]);

    const callArgs = mockEmailsSend.mock.calls[0][0];
    expect(callArgs.html).toContain("#10b981"); // green color for below-target
  });
});

const mockRedisGet = jest.fn();
const mockRedisKeys = jest.fn();
const mockRedisSet = jest.fn();
const mockSearchEngine = jest.fn();
const mockSendMilesAlertEmail = jest.fn();
const mockShouldFireAlert = jest.fn();
const mockUpdateAlertLastFired = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: {
    get: mockRedisGet,
    keys: mockRedisKeys,
    set: mockRedisSet,
  },
}));

jest.mock("@/lib/engine", () => ({
  searchEngine: mockSearchEngine,
}));

jest.mock("@/lib/resend-client", () => ({
  sendMilesAlertEmail: mockSendMilesAlertEmail,
}));

jest.mock("@/lib/miles-alerts", () => {
  const originalModule = jest.requireActual("@/lib/miles-alerts");
  return {
    ...originalModule,
    shouldFireAlert: mockShouldFireAlert,
    updateAlertLastFired: mockUpdateAlertLastFired,
  };
});

jest.mock("@/lib/logger");

import { checkMilesAlerts } from "@/lib/inngest-miles-alerts";
import type { MilesAlert } from "@/lib/miles-alerts";

describe("checkMilesAlerts cron job", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("finds and processes a single alert with matching deal", async () => {
    const now = Date.now();
    const alertEmail = "user@example.com";
    const alert: MilesAlert = {
      email: alertEmail,
      route: "SIN-LAX",
      program: "Singapore KrisFlyer",
      thresholdCpp: 0.8,
      createdAt: now - 7 * 24 * 60 * 60 * 1000,
    };

    // Mock Redis: find one alert key
    mockRedisKeys.mockResolvedValue([
      `keza:miles-alert:${alertEmail}:SIN-LAX:Singapore KrisFlyer`,
    ]);

    // Mock Redis: retrieve the alert
    mockRedisGet.mockResolvedValue(alert);

    // Mock shouldFireAlert: alert is ready to fire
    mockShouldFireAlert.mockResolvedValue(true);

    // Mock searchEngine: return flights with a Singapore Airlines (operatingAirline)
    // offering KrisFlyer at 0.75 cpp (below threshold)
    const searchResults = [
      {
        from: "SIN",
        to: "LAX",
        price: 800,
        airlines: ["SQ"],
        cabin: "economy",
        passengers: 1,
        cashCost: 800,
        milesCost: 100,
        savings: 700,
        recommendation: "USE_MILES" as const,
        milesOptions: [
          {
            type: "DIRECT" as const,
            program: "Singapore KrisFlyer",
            operatingAirline: "SQ",
            milesRequired: 60000,
            taxes: 30,
            valuePerMile: 0.0133,
            milesCost: 798,
            totalMilesCost: 828,
            savings: -28,
            confidence: "HIGH" as const,
          },
        ],
        bestOption: {
          type: "DIRECT" as const,
          program: "Singapore KrisFlyer",
          operatingAirline: "SQ",
          milesRequired: 60000,
          taxes: 30,
          valuePerMile: 0.0133,
          milesCost: 798,
          totalMilesCost: 828,
          savings: -28,
          confidence: "HIGH" as const,
        },
        explanation: "Cash and miles are similar",
        displayMessage: "Good miles deal",
        disclaimer: "",
        cabinPriceEstimated: false,
        searchId: "test-search-1",
        optimization: { strategy: "DIRECT" },
      },
    ];

    mockSearchEngine.mockResolvedValue(searchResults);

    // Mock email send
    mockSendMilesAlertEmail.mockResolvedValue({ success: true });

    // Mock updateAlertLastFired
    mockUpdateAlertLastFired.mockResolvedValue(undefined);

    const result = await (checkMilesAlerts as any).fn();

    // Verify Redis keys was called for the pattern
    expect(mockRedisKeys).toHaveBeenCalledWith("keza:miles-alert:*");

    // Verify searchEngine was called with correct params
    expect(mockSearchEngine).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "SIN",
        to: "LAX",
        cabin: "economy",
        passengers: 1,
      }),
      expect.any(String)
    );

    // Verify email was sent
    expect(mockSendMilesAlertEmail).toHaveBeenCalled();

    // Verify alert was updated
    expect(mockUpdateAlertLastFired).toHaveBeenCalledWith(
      alertEmail,
      "SIN-LAX",
      "Singapore KrisFlyer",
      expect.any(Number)
    );

    // Verify return value
    expect(result).toEqual({
      checked: 1,
      sent: 1,
    });
  });

  it("skips alerts that fail shouldFireAlert check (cooldown)", async () => {
    const now = Date.now();
    const alertEmail = "user@example.com";
    const alert: MilesAlert = {
      email: alertEmail,
      route: "SIN-LAX",
      program: "Singapore KrisFlyer",
      thresholdCpp: 0.8,
      createdAt: now - 7 * 24 * 60 * 60 * 1000,
      lastFiredAt: now - 12 * 60 * 60 * 1000, // Fired 12 hours ago, still in cooldown
    };

    mockRedisKeys.mockResolvedValue([
      `keza:miles-alert:${alertEmail}:SIN-LAX:Singapore KrisFlyer`,
    ]);

    mockRedisGet.mockResolvedValue(alert);

    // shouldFireAlert returns false (within 24h cooldown)
    mockShouldFireAlert.mockResolvedValue(false);

    const result = await (checkMilesAlerts as any).fn();

    // Should not search when alert is in cooldown
    expect(mockSearchEngine).not.toHaveBeenCalled();
    expect(mockSendMilesAlertEmail).not.toHaveBeenCalled();

    // Still counted as checked
    expect(result).toEqual({
      checked: 1,
      sent: 0,
    });
  });

  it("does not send email when best CPP exceeds threshold", async () => {
    const now = Date.now();
    const alertEmail = "user@example.com";
    const alert: MilesAlert = {
      email: alertEmail,
      route: "SIN-LAX",
      program: "Singapore KrisFlyer",
      thresholdCpp: 0.01, // 1 cent per point threshold
      createdAt: now - 7 * 24 * 60 * 60 * 1000,
    };

    mockRedisKeys.mockResolvedValue([
      `keza:miles-alert:${alertEmail}:SIN-LAX:Singapore KrisFlyer`,
    ]);

    mockRedisGet.mockResolvedValue(alert);
    mockShouldFireAlert.mockResolvedValue(true);

    // Mock searchEngine: return flights with CPP > threshold
    const searchResults = [
      {
        from: "SIN",
        to: "LAX",
        price: 1200,
        airlines: ["SQ"],
        cabin: "economy",
        passengers: 1,
        cashCost: 1200,
        milesCost: 1000,
        savings: 200,
        recommendation: "USE_CASH" as const,
        milesOptions: [
          {
            type: "DIRECT" as const,
            program: "Singapore KrisFlyer",
            operatingAirline: "SQ",
            milesRequired: 60000,
            taxes: 30,
            valuePerMile: 0.02, // cpp = 0.02 = 2 cents (exceeds 1 cent threshold)
            milesCost: 1200,
            totalMilesCost: 1230,
            savings: -30,
            confidence: "HIGH" as const,
          },
        ],
        bestOption: {
          type: "DIRECT" as const,
          program: "Singapore KrisFlyer",
          operatingAirline: "SQ",
          milesRequired: 60000,
          taxes: 30,
          valuePerMile: 0.02,
          milesCost: 1200,
          totalMilesCost: 1230,
          savings: -30,
          confidence: "HIGH" as const,
        },
        explanation: "Cash is better",
        displayMessage: "Poor miles deal",
        disclaimer: "",
        cabinPriceEstimated: false,
        searchId: "test-search-2",
        optimization: { strategy: "DIRECT" },
      },
    ];

    mockSearchEngine.mockResolvedValue(searchResults);

    const result = await (checkMilesAlerts as any).fn();

    // Should search but not send email (CPP too high)
    expect(mockSearchEngine).toHaveBeenCalled();
    expect(mockSendMilesAlertEmail).not.toHaveBeenCalled();
    expect(mockUpdateAlertLastFired).not.toHaveBeenCalled();

    expect(result).toEqual({
      checked: 1,
      sent: 0,
    });
  });

  it("processes multiple alerts for different emails", async () => {
    const now = Date.now();

    const alert1: MilesAlert = {
      email: "user1@example.com",
      route: "SIN-LAX",
      program: "Singapore KrisFlyer",
      thresholdCpp: 0.8,
      createdAt: now - 7 * 24 * 60 * 60 * 1000,
    };

    const alert2: MilesAlert = {
      email: "user2@example.com",
      route: "NRT-LAX",
      program: "ANA Mileage Club",
      thresholdCpp: 1.0,
      createdAt: now - 7 * 24 * 60 * 60 * 1000,
    };

    mockRedisKeys.mockResolvedValue([
      "keza:miles-alert:user1@example.com:SIN-LAX:Singapore KrisFlyer",
      "keza:miles-alert:user2@example.com:NRT-LAX:ANA Mileage Club",
    ]);

    mockRedisGet
      .mockResolvedValueOnce(alert1)
      .mockResolvedValueOnce(alert2);

    mockShouldFireAlert.mockResolvedValue(true);

    // Mock searchEngine to return different results for each call
    // First call: SIN-LAX with SQ option
    mockSearchEngine
      .mockResolvedValueOnce([
        {
          from: "SIN",
          to: "LAX",
          price: 800,
          airlines: ["SQ"],
          cabin: "economy",
          passengers: 1,
          cashCost: 800,
          milesCost: 100,
          savings: 700,
          recommendation: "USE_MILES" as const,
          milesOptions: [
            {
              type: "DIRECT" as const,
              program: "Singapore KrisFlyer",
              operatingAirline: "SQ",
              milesRequired: 60000,
              taxes: 30,
              valuePerMile: 0.0133,
              milesCost: 798,
              totalMilesCost: 828,
              savings: -28,
              confidence: "HIGH" as const,
            },
          ],
          bestOption: {
            type: "DIRECT" as const,
            program: "Singapore KrisFlyer",
            operatingAirline: "SQ",
            milesRequired: 60000,
            taxes: 30,
            valuePerMile: 0.0133,
            milesCost: 798,
            totalMilesCost: 828,
            savings: -28,
            confidence: "HIGH" as const,
          },
          explanation: "Cash and miles are similar",
          displayMessage: "Good miles deal",
          disclaimer: "",
          cabinPriceEstimated: false,
          searchId: "test-search-1",
          optimization: { strategy: "DIRECT" },
        },
      ])
      // Second call: NRT-LAX with NH option (NOT ANA)
      .mockResolvedValueOnce([
        {
          from: "NRT",
          to: "LAX",
          price: 900,
          airlines: ["NH"],
          cabin: "economy",
          passengers: 1,
          cashCost: 900,
          milesCost: 200,
          savings: 700,
          recommendation: "USE_MILES" as const,
          milesOptions: [
            {
              type: "DIRECT" as const,
              program: "Japan Airlines Mileage Bank", // NOT the ANA program being searched for
              operatingAirline: "JL",
              milesRequired: 65000,
              taxes: 35,
              valuePerMile: 0.0133,
              milesCost: 864,
              totalMilesCost: 899,
              savings: 1,
              confidence: "HIGH" as const,
            },
          ],
          bestOption: {
            type: "DIRECT" as const,
            program: "Japan Airlines Mileage Bank",
            operatingAirline: "JL",
            milesRequired: 65000,
            taxes: 35,
            valuePerMile: 0.0133,
            milesCost: 864,
            totalMilesCost: 899,
            savings: 1,
            confidence: "HIGH" as const,
          },
          explanation: "Close call",
          displayMessage: "Decent miles deal",
          disclaimer: "",
          cabinPriceEstimated: false,
          searchId: "test-search-2",
          optimization: { strategy: "DIRECT" },
        },
      ]);

    mockSendMilesAlertEmail.mockResolvedValue({ success: true });
    mockUpdateAlertLastFired.mockResolvedValue(undefined);

    const result = await (checkMilesAlerts as any).fn();

    // Both alerts processed, but only first one sent (second one doesn't have ANA option)
    expect(result).toEqual({
      checked: 2,
      sent: 1,
    });

    // Email called once (only for first alert)
    expect(mockSendMilesAlertEmail).toHaveBeenCalledTimes(1);
    expect(mockUpdateAlertLastFired).toHaveBeenCalledTimes(1);
  });

  it("handles errors gracefully and continues processing", async () => {
    const now = Date.now();

    const alert1: MilesAlert = {
      email: "user1@example.com",
      route: "SIN-LAX",
      program: "Singapore KrisFlyer",
      thresholdCpp: 0.8,
      createdAt: now - 7 * 24 * 60 * 60 * 1000,
    };

    const alert2: MilesAlert = {
      email: "user2@example.com",
      route: "NRT-LAX",
      program: "ANA Mileage Club",
      thresholdCpp: 1.0,
      createdAt: now - 7 * 24 * 60 * 60 * 1000,
    };

    mockRedisKeys.mockResolvedValue([
      "keza:miles-alert:user1@example.com:SIN-LAX:Singapore KrisFlyer",
      "keza:miles-alert:user2@example.com:NRT-LAX:ANA Mileage Club",
    ]);

    mockRedisGet
      .mockResolvedValueOnce(alert1)
      .mockResolvedValueOnce(alert2);

    // First alert fails shouldFireAlert check, second one passes
    mockShouldFireAlert
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    // searchEngine only called for second alert
    mockSearchEngine.mockResolvedValue([
      {
        from: "NRT",
        to: "LAX",
        price: 1000,
        airlines: ["NH"],
        cabin: "economy",
        passengers: 1,
        cashCost: 1000,
        milesCost: 500,
        savings: 500,
        recommendation: "USE_MILES" as const,
        milesOptions: [
          {
            type: "DIRECT" as const,
            program: "ANA Mileage Club",
            operatingAirline: "NH",
            milesRequired: 70000,
            taxes: 40,
            valuePerMile: 0.0133,
            milesCost: 931,
            totalMilesCost: 971,
            savings: 29,
            confidence: "HIGH" as const,
          },
        ],
        bestOption: {
          type: "DIRECT" as const,
          program: "ANA Mileage Club",
          operatingAirline: "NH",
          milesRequired: 70000,
          taxes: 40,
          valuePerMile: 0.0133,
          milesCost: 931,
          totalMilesCost: 971,
          savings: 29,
          confidence: "HIGH" as const,
        },
        explanation: "Miles are better",
        displayMessage: "Excellent miles deal",
        disclaimer: "",
        cabinPriceEstimated: false,
        searchId: "test-search-2",
        optimization: { strategy: "DIRECT" },
      },
    ]);

    mockSendMilesAlertEmail.mockResolvedValue({ success: true });
    mockUpdateAlertLastFired.mockResolvedValue(undefined);

    const result = await (checkMilesAlerts as any).fn();

    // Both checked, but only second one sent
    expect(result).toEqual({
      checked: 2,
      sent: 1,
    });

    expect(mockSearchEngine).toHaveBeenCalledTimes(1);
    expect(mockSendMilesAlertEmail).toHaveBeenCalledTimes(1);
  });
});

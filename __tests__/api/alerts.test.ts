import { POST } from "@/app/api/alerts/route";
import { NextRequest } from "next/server";

// Mock dependencies
jest.mock("@/lib/alerts", () => ({
  createAlert: jest.fn(async (params) => ({
    id: "alt_test123",
    email: params.email,
    from: params.from,
    to: params.to,
    cabin: params.cabin,
    basePrice: params.currentPrice,
    targetPrice: params.targetPrice || params.currentPrice * 0.9,
    createdAt: new Date().toISOString(),
    notifCount: 0,
    active: true,
    notifFrequency: params.notifFrequency || "instant",
    milesAlert: params.milesAlert,
  })),
  getAlertsByEmail: jest.fn(async () => []),
  sendAlertConfirmationEmail: jest.fn(async () => true),
  getAlertById: jest.fn(),
  updateAlertFrequency: jest.fn(),
}));

jest.mock("@/lib/lemonsqueezy", () => ({
  isProUser: jest.fn(async () => false),
}));

jest.mock("@/lib/referral", () => ({
  getReferralCredits: jest.fn(async () => 0),
  processReferralConversion: jest.fn(),
}));

jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: jest.fn(() => null),
}));

jest.mock("@/lib/analytics", () => ({
  trackServerEvent: jest.fn(),
}));

describe("POST /api/alerts with milesAlert", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should accept milesAlert payload", async () => {
    const mockRequest = new Request("http://localhost:3000/api/alerts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "user@example.com",
        from: "SIN",
        to: "LAX",
        cabin: "business",
        currentPrice: 2000,
        milesAlert: {
          program: "Singapore KrisFlyer",
          targetCpp: 1.5,
          baseCpp: 1.2,
        },
      }),
    }) as unknown as NextRequest;

    const response = await POST(mockRequest);
    const data = await response.json();

    expect([200, 201]).toContain(response.status);
    expect(data.ok).toBe(true);
    expect(data.alert.milesAlert).toBeDefined();
    expect(data.alert.milesAlert.program).toBe("Singapore KrisFlyer");
    expect(data.alert.milesAlert.targetCpp).toBe(1.5);
    expect(data.alert.milesAlert.baseCpp).toBe(1.2);
  });

  it("should reject invalid milesAlert with targetCpp >20", async () => {
    const mockRequest = new Request("http://localhost:3000/api/alerts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "user@example.com",
        from: "SIN",
        to: "LAX",
        cabin: "business",
        currentPrice: 2000,
        milesAlert: {
          program: "Singapore KrisFlyer",
          targetCpp: 25, // > 20
          baseCpp: 1.2,
        },
      }),
    }) as unknown as NextRequest;

    const response = await POST(mockRequest);
    const data = await response.json();

    // Should create alert but without milesAlert (validation failed)
    expect(data.alert.milesAlert).toBeUndefined();
  });

  it("should reject invalid milesAlert with targetCpp <= 0", async () => {
    const mockRequest = new Request("http://localhost:3000/api/alerts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "user@example.com",
        from: "SIN",
        to: "LAX",
        cabin: "business",
        currentPrice: 2000,
        milesAlert: {
          program: "Singapore KrisFlyer",
          targetCpp: 0,
          baseCpp: 1.2,
        },
      }),
    }) as unknown as NextRequest;

    const response = await POST(mockRequest);
    const data = await response.json();

    // Should create alert but without milesAlert
    expect(data.alert.milesAlert).toBeUndefined();
  });

  it("should reject invalid milesAlert with empty program", async () => {
    const mockRequest = new Request("http://localhost:3000/api/alerts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "user@example.com",
        from: "SIN",
        to: "LAX",
        cabin: "business",
        currentPrice: 2000,
        milesAlert: {
          program: "",
          targetCpp: 1.5,
          baseCpp: 1.2,
        },
      }),
    }) as unknown as NextRequest;

    const response = await POST(mockRequest);
    const data = await response.json();

    // Should create alert but without milesAlert
    expect(data.alert.milesAlert).toBeUndefined();
  });

  it("should accept milesAlert with valid targetCpp range (0.1 to 20)", async () => {
    const validRanges = [0.1, 1.0, 1.5, 5.0, 10.0, 20.0];

    for (const cpp of validRanges) {
      const mockRequest = new Request("http://localhost:3000/api/alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "user@example.com",
          from: "SIN",
          to: "LAX",
          cabin: "business",
          currentPrice: 2000,
          milesAlert: {
            program: "Singapore KrisFlyer",
            targetCpp: cpp,
            baseCpp: 1.2,
          },
        }),
      }) as unknown as NextRequest;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(data.alert.milesAlert).toBeDefined();
      expect(data.alert.milesAlert.targetCpp).toBe(cpp);
    }
  });

  it("should handle missing milesAlert (backward compatibility)", async () => {
    const mockRequest = new Request("http://localhost:3000/api/alerts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "user@example.com",
        from: "SIN",
        to: "LAX",
        cabin: "business",
        currentPrice: 2000,
        // No milesAlert property
      }),
    }) as unknown as NextRequest;

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(data.alert.milesAlert).toBeUndefined();
    expect(data.ok).toBe(true);
  });

  it("should validate baseCpp is a number", async () => {
    const mockRequest = new Request("http://localhost:3000/api/alerts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "user@example.com",
        from: "SIN",
        to: "LAX",
        cabin: "business",
        currentPrice: 2000,
        milesAlert: {
          program: "Singapore KrisFlyer",
          targetCpp: 1.5,
          baseCpp: "not-a-number",
        },
      }),
    }) as unknown as NextRequest;

    const response = await POST(mockRequest);
    const data = await response.json();

    // Should create alert but without milesAlert
    expect(data.alert.milesAlert).toBeUndefined();
  });
});

import { GET, PATCH, DELETE } from "@/app/api/alerts/route";
import { NextRequest } from "next/server";
import { createManageAlertsToken } from "@/lib/alertTokens";

jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/lib/redis", () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock("@/lib/alerts", () => ({
  getAlertsByEmail: jest.fn().mockResolvedValue([]),
  getAlertById: jest.fn().mockImplementation((id: string) => {
    if (id === "alert-123") {
      return Promise.resolve({
        id: "alert-123",
        email: "user@example.com",
        from: "JFK",
        to: "LAX",
      });
    }
    return Promise.resolve(null);
  }),
  updateAlertFrequency: jest.fn().mockResolvedValue(true),
  deactivateAlert: jest.fn().mockResolvedValue(true),
}));

describe("P0-3: Alert Token Leakage - Authorization Header", () => {
  const testEmail = "user@example.com";
  const ALERT_TOKEN_SECRET = "test-alert-secret-key";
  const originalEnv = process.env.ALERT_TOKEN_SECRET;

  beforeAll(() => {
    process.env.ALERT_TOKEN_SECRET = ALERT_TOKEN_SECRET;
  });

  afterAll(() => {
    process.env.ALERT_TOKEN_SECRET = originalEnv;
  });

  test("GET /api/alerts rejects token in query params (legacy insecure method)", async () => {
    const token = createManageAlertsToken(testEmail);

    // Old insecure way: token in query params
    const req = new NextRequest(
      `http://localhost:3000/api/alerts?email=${testEmail}&token=${token}`,
      { method: "GET" }
    );

    const response = await GET(req);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain("Unauthorized");
  });

  test("GET /api/alerts accepts token in Authorization header", async () => {
    const token = createManageAlertsToken(testEmail);

    const req = new NextRequest(
      `http://localhost:3000/api/alerts?email=${testEmail}`,
      {
        method: "GET",
        headers: new Headers({
          "Authorization": `Bearer ${token}`,
        }),
      }
    );

    const response = await GET(req);
    // Should succeed (mock returns empty alerts)
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.alerts).toBeDefined();
  });

  test("PATCH /api/alerts requires Authorization header, not form body", async () => {
    const token = createManageAlertsToken(testEmail);

    // Old insecure way: token in body
    const req = new NextRequest("http://localhost:3000/api/alerts", {
      method: "PATCH",
      body: JSON.stringify({
        id: "alert-123",
        notifFrequency: "daily",
        token: token, // Token in body is rejected
      }),
    });

    const response = await PATCH(req);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain("Unauthorized");
  });

  test("PATCH /api/alerts accepts token in Authorization header", async () => {
    const token = createManageAlertsToken(testEmail);

    const req = new NextRequest("http://localhost:3000/api/alerts", {
      method: "PATCH",
      body: JSON.stringify({
        id: "alert-123",
        notifFrequency: "daily",
      }),
      headers: new Headers({
        "Authorization": `Bearer ${token}`,
      }),
    });

    const response = await PATCH(req);
    // May fail for other reasons, but not CSRF/auth
    expect([200, 404, 400]).toContain(response.status);
  });

  test("DELETE /api/alerts rejects token in query params", async () => {
    const token = createManageAlertsToken(testEmail);

    const req = new NextRequest(
      `http://localhost:3000/api/alerts?id=alert-123&email=${testEmail}&token=${token}`,
      { method: "DELETE" }
    );

    const response = await DELETE(req);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain("Unauthorized");
  });

  test("DELETE /api/alerts accepts token in Authorization header", async () => {
    const token = createManageAlertsToken(testEmail);

    const req = new NextRequest(
      `http://localhost:3000/api/alerts?id=alert-123&email=${testEmail}`,
      {
        method: "DELETE",
        headers: new Headers({
          "Authorization": `Bearer ${token}`,
        }),
      }
    );

    const response = await DELETE(req);
    // May fail for other reasons, but not auth
    expect([200, 404, 400]).toContain(response.status);
  });
});

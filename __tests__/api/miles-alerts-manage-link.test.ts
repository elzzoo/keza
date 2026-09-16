import { NextRequest } from "next/server";

const mockGetMilesAlertsByEmail = jest.fn();
const mockRateLimitResponse = jest.fn<Promise<null>, [Request, unknown]>(async () => null);
const mockCreateManageAlertsToken = jest.fn<string, [string]>(() => "manage-token");
const mockSend = jest.fn(async (_payload: unknown) => ({ id: "email_123" }));

jest.mock("server-only", () => ({}));
jest.mock("@/lib/miles-alerts", () => ({
  getMilesAlertsByEmail: (email: string) => mockGetMilesAlertsByEmail(email),
}));
jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: (request: Request, options: unknown) => mockRateLimitResponse(request, options),
}));
jest.mock("@/lib/alertTokens", () => ({
  createManageAlertsToken: (email: string) => mockCreateManageAlertsToken(email),
}));
jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: (payload: unknown) => mockSend(payload),
    },
  })),
}));

import { POST } from "@/app/api/miles-alerts/manage-link/route";

function req(body: unknown) {
  return new NextRequest("http://localhost/api/miles-alerts/manage-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/miles-alerts/manage-link", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimitResponse.mockResolvedValue(null);
    mockCreateManageAlertsToken.mockReturnValue("manage-token");
  });

  it("sends a generic ok response and emails a signed manage link when alerts exist", async () => {
    mockGetMilesAlertsByEmail.mockResolvedValueOnce([
      { email: "test@example.com", route: "SIN-LAX", program: "KrisFlyer", thresholdCpp: 1.5, createdAt: 1 },
    ]);

    const res = await POST(req({ email: " TEST@example.com " }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockGetMilesAlertsByEmail).toHaveBeenCalledWith("test@example.com");
    expect(mockCreateManageAlertsToken).toHaveBeenCalledWith("test@example.com");
    expect(mockSend).toHaveBeenCalledTimes(1);
    const sent = mockSend.mock.calls[0]?.[0] as { to: string; text: string };
    expect(sent.to).toBe("test@example.com");
    expect(sent.text).toContain("/miles-alerts?email=test%40example.com&token=manage-token");
  });

  it("returns generic ok without emailing when no alerts exist", async () => {
    mockGetMilesAlertsByEmail.mockResolvedValueOnce([]);

    const res = await POST(req({ email: "missing@example.com" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid email", async () => {
    const res = await POST(req({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(mockGetMilesAlertsByEmail).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON", async () => {
    const badReq = new NextRequest("http://localhost/api/miles-alerts/manage-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ bad json",
    });

    const res = await POST(badReq);
    expect(res.status).toBe(400);
  });
});

// __tests__/api/push-subscribe.test.ts
const mockSaveForEmail = jest.fn();
const mockVerify = jest.fn();

jest.mock("@/lib/push", () => ({
  savePushSubscriptionForEmail: (...args: unknown[]) => mockSaveForEmail(...args),
}));
jest.mock("@/lib/alertTokens", () => ({
  verifyManageAlertsToken: (...args: unknown[]) => mockVerify(...args),
}));
jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: jest.fn().mockResolvedValue(null),
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/push/subscribe/route";

const VALID_SUB = {
  endpoint: "https://push.example.com/sub/a",
  keys: { p256dh: "key-p256dh", auth: "key-auth" },
};
const VALID_EMAIL = "user@example.com";
const VALID_TOKEN = "valid-token";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => jest.clearAllMocks());

describe("POST /api/push/subscribe", () => {
  it("returns 401 when token is missing", async () => {
    mockVerify.mockReturnValue(false);
    const res = await POST(makeRequest({ subscription: VALID_SUB, email: VALID_EMAIL }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when token is invalid", async () => {
    mockVerify.mockReturnValue(false);
    const res = await POST(makeRequest({ subscription: VALID_SUB, email: VALID_EMAIL, token: "bad-token" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when email is missing", async () => {
    mockVerify.mockReturnValue(true);
    const res = await POST(makeRequest({ subscription: VALID_SUB, token: VALID_TOKEN }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when subscription endpoint is missing", async () => {
    mockVerify.mockReturnValue(true);
    const res = await POST(makeRequest({ subscription: { keys: VALID_SUB.keys }, email: VALID_EMAIL, token: VALID_TOKEN }));
    expect(res.status).toBe(400);
  });

  it("returns 201 and saves subscription for valid request", async () => {
    mockVerify.mockReturnValue(true);
    mockSaveForEmail.mockResolvedValue(undefined);
    const res = await POST(makeRequest({ subscription: VALID_SUB, email: VALID_EMAIL, token: VALID_TOKEN }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockSaveForEmail).toHaveBeenCalledTimes(1);
  });
});

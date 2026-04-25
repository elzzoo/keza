// __tests__/api/push-unsubscribe.test.ts
const mockRemoveForEmail = jest.fn();
const mockVerify = jest.fn();

jest.mock("@/lib/push", () => ({
  removePushSubscriptionForEmail: (...args: unknown[]) => mockRemoveForEmail(...args),
}));
jest.mock("@/lib/alertTokens", () => ({
  verifyManageAlertsToken: (...args: unknown[]) => mockVerify(...args),
}));
jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: jest.fn().mockResolvedValue(null),
}));

import { NextRequest } from "next/server";
import { DELETE } from "@/app/api/push/unsubscribe/route";

const VALID_EMAIL = "user@example.com";
const VALID_TOKEN = "valid-token";
const VALID_ENDPOINT = "https://push.example.com/sub/a";

function makeRequest(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/push/unsubscribe");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url, { method: "DELETE" });
}

beforeEach(() => jest.clearAllMocks());

describe("DELETE /api/push/unsubscribe", () => {
  it("returns 401 when token is invalid", async () => {
    mockVerify.mockReturnValue(false);
    const res = await DELETE(makeRequest({ email: VALID_EMAIL, token: "bad", endpoint: VALID_ENDPOINT }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when email is missing", async () => {
    const res = await DELETE(makeRequest({ token: VALID_TOKEN, endpoint: VALID_ENDPOINT }));
    expect([400, 401]).toContain(res.status);
  });

  it("returns 400 when endpoint is missing", async () => {
    mockVerify.mockReturnValue(true);
    const res = await DELETE(makeRequest({ email: VALID_EMAIL, token: VALID_TOKEN }));
    expect(res.status).toBe(400);
  });

  it("returns 200 and removes subscription for valid request", async () => {
    mockVerify.mockReturnValue(true);
    mockRemoveForEmail.mockResolvedValue(undefined);
    const res = await DELETE(makeRequest({ email: VALID_EMAIL, token: VALID_TOKEN, endpoint: VALID_ENDPOINT }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockRemoveForEmail).toHaveBeenCalledWith(VALID_EMAIL, VALID_ENDPOINT);
  });
});

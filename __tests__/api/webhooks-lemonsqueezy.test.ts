// __tests__/api/webhooks-lemonsqueezy.test.ts

const mockGrantPro = jest.fn();
const mockRevokePro = jest.fn();
const mockVerify = jest.fn();
const mockDiscord = jest.fn();
const mockTrack = jest.fn();

jest.mock("@/lib/lemonsqueezy", () => ({
  verifyLemonWebhook: (...args: unknown[]) => mockVerify(...args),
  grantPro: (...args: unknown[]) => mockGrantPro(...args),
  revokePro: (...args: unknown[]) => mockRevokePro(...args),
}));
jest.mock("@/lib/discord", () => ({
  sendDiscordAlert: (...args: unknown[]) => mockDiscord(...args),
}));
jest.mock("@/lib/analytics", () => ({
  trackServerEvent: (...args: unknown[]) => mockTrack(...args),
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/webhooks/lemonsqueezy/route";

function makeRequest(payload: unknown, signature = "valid-sig"): NextRequest {
  return new NextRequest("http://localhost/api/webhooks/lemonsqueezy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-signature": signature,
    },
    body: JSON.stringify(payload),
  });
}

const BASE_PAYLOAD = {
  meta: {
    event_name: "subscription_created",
    custom_data: { keza_email: "user@example.com" },
  },
  data: {
    id: "sub_123",
    attributes: {
      user_email: "user@example.com",
      status: "active",
      ends_at: null,
    },
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockVerify.mockReturnValue(true);
  mockGrantPro.mockResolvedValue(undefined);
  mockRevokePro.mockResolvedValue(undefined);
  mockDiscord.mockResolvedValue(undefined);
  mockTrack.mockResolvedValue(undefined);
});

describe("POST /api/webhooks/lemonsqueezy", () => {
  it("returns 401 when signature is invalid", async () => {
    mockVerify.mockReturnValue(false);
    const res = await POST(makeRequest(BASE_PAYLOAD));
    expect(res.status).toBe(401);
  });

  it("grants Pro on subscription_created", async () => {
    const res = await POST(makeRequest(BASE_PAYLOAD));
    expect(res.status).toBe(200);
    expect(mockGrantPro).toHaveBeenCalledWith("user@example.com", "sub_123");
  });

  it("grants Pro on subscription_resumed", async () => {
    const payload = { ...BASE_PAYLOAD, meta: { ...BASE_PAYLOAD.meta, event_name: "subscription_resumed" } };
    const res = await POST(makeRequest(payload));
    expect(res.status).toBe(200);
    expect(mockGrantPro).toHaveBeenCalledWith("user@example.com", "sub_123");
  });

  it("revokes Pro on subscription_cancelled", async () => {
    const payload = { ...BASE_PAYLOAD, meta: { ...BASE_PAYLOAD.meta, event_name: "subscription_cancelled" } };
    const res = await POST(makeRequest(payload));
    expect(res.status).toBe(200);
    expect(mockRevokePro).toHaveBeenCalledWith("user@example.com");
  });

  it("revokes Pro on subscription_expired", async () => {
    const payload = { ...BASE_PAYLOAD, meta: { ...BASE_PAYLOAD.meta, event_name: "subscription_expired" } };
    const res = await POST(makeRequest(payload));
    expect(res.status).toBe(200);
    expect(mockRevokePro).toHaveBeenCalledWith("user@example.com");
  });

  it("uses user_email when custom_data has no keza_email", async () => {
    const payload = { ...BASE_PAYLOAD, meta: { event_name: "subscription_created" } };
    const res = await POST(makeRequest(payload));
    expect(res.status).toBe(200);
    expect(mockGrantPro).toHaveBeenCalledWith("user@example.com", "sub_123");
  });

  it("returns 400 when JSON is invalid", async () => {
    const req = new NextRequest("http://localhost/api/webhooks/lemonsqueezy", {
      method: "POST",
      headers: { "x-signature": "sig" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

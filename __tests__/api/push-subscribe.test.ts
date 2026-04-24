// __tests__/api/push-subscribe.test.ts
// Tests for POST /api/push/subscribe

jest.mock("@/lib/push", () => ({
  savePushSubscription: jest.fn(),
}));
jest.mock("@/lib/redis", () => ({
  redis: { scard: jest.fn().mockResolvedValue(0) },
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/push/subscribe/route";
import { savePushSubscription } from "@/lib/push";

const mockSave = savePushSubscription as jest.MockedFunction<typeof savePushSubscription>;

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => jest.clearAllMocks());

describe("POST /api/push/subscribe", () => {
  it("returns 400 when body is empty object", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 400 when endpoint is missing", async () => {
    const res = await POST(makeRequest({ keys: { p256dh: "k", auth: "a" } }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when keys are missing", async () => {
    const res = await POST(makeRequest({ endpoint: "https://push.example.com/sub" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when p256dh key is missing", async () => {
    const res = await POST(
      makeRequest({ endpoint: "https://push.example.com/sub", keys: { auth: "a" } })
    );
    expect(res.status).toBe(400);
  });

  it("returns 201 and calls savePushSubscription for valid body", async () => {
    mockSave.mockResolvedValue(undefined);
    const res = await POST(
      makeRequest({
        endpoint: "https://push.example.com/sub",
        keys: { p256dh: "key-p256dh", auth: "key-auth" },
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockSave).toHaveBeenCalledTimes(1);
  });
});

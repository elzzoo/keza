import { NextRequest, NextResponse } from "next/server";

const mockGetPushSubscriptions = jest.fn();
const mockSendPushToAll = jest.fn();
const mockHasCronSecret = jest.fn();
const mockRateLimitResponse = jest.fn<Promise<NextResponse | null>, [Request, unknown]>(async () => null);

jest.mock("server-only", () => ({}));
jest.mock("@/lib/push", () => ({
  getPushSubscriptions: (...args: unknown[]) => mockGetPushSubscriptions(...args),
  sendPushToAll: (...args: unknown[]) => mockSendPushToAll(...args),
}));
jest.mock("@/lib/auth", () => ({
  hasCronSecret: (...args: unknown[]) => mockHasCronSecret(...args),
}));
jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: (request: Request, options: unknown) => mockRateLimitResponse(request, options),
}));

import { GET, POST } from "@/app/api/push/test/route";

function req(method: string) {
  return new NextRequest("http://localhost/api/push/test", { method });
}

describe("/api/push/test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimitResponse.mockResolvedValue(null);
    mockHasCronSecret.mockReturnValue(true);
    mockGetPushSubscriptions.mockResolvedValue([{ endpoint: "https://push.example/sub", keys: { p256dh: "p", auth: "a" } }]);
    mockSendPushToAll.mockResolvedValue(1);
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public";
    process.env.VAPID_PRIVATE_KEY = "private";
  });

  it("rate-limits POST before auth and push sends", async () => {
    mockRateLimitResponse.mockResolvedValueOnce(NextResponse.json({ error: "limited" }, { status: 429 }));

    const res = await POST(req("POST"));

    expect(res.status).toBe(429);
    expect(mockHasCronSecret).not.toHaveBeenCalled();
    expect(mockSendPushToAll).not.toHaveBeenCalled();
  });

  it("requires cron auth on POST", async () => {
    mockHasCronSecret.mockReturnValueOnce(false);

    const res = await POST(req("POST"));

    expect(res.status).toBe(401);
    expect(mockSendPushToAll).not.toHaveBeenCalled();
  });

  it("sends a test push to all subscribers", async () => {
    const res = await POST(req("POST"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ ok: true, sent: 1, total: 1 });
    expect(mockSendPushToAll).toHaveBeenCalledWith(expect.objectContaining({
      url: "/alertes",
    }));
  });

  it("rate-limits GET before auth and subscription reads", async () => {
    mockRateLimitResponse.mockResolvedValueOnce(NextResponse.json({ error: "limited" }, { status: 429 }));

    const res = await GET(req("GET"));

    expect(res.status).toBe(429);
    expect(mockHasCronSecret).not.toHaveBeenCalled();
    expect(mockGetPushSubscriptions).not.toHaveBeenCalled();
  });

  it("returns push readiness status", async () => {
    const res = await GET(req("GET"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      subscribers: 1,
      vapidConfigured: true,
      ready: true,
    });
  });
});

import { NextRequest } from "next/server";

const mockGetServerSession = jest.fn();
const mockCheckBalanceSyncLimit = jest.fn();
const mockGetUserCredentials = jest.fn();
const mockSyncUserBalances = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock("@/lib/auth", () => ({ authOptions: {} }));

jest.mock("@/lib/balanceSyncLimit", () => ({
  checkBalanceSyncLimit: (...args: unknown[]) => mockCheckBalanceSyncLimit(...args),
}));

jest.mock("@/lib/portfolio", () => ({
  getUserCredentials: (...args: unknown[]) => mockGetUserCredentials(...args),
}));

jest.mock("@/lib/balanceSync", () => ({
  syncUserBalances: (...args: unknown[]) => mockSyncUserBalances(...args),
}));

jest.mock("@/lib/logger", () => ({
  logError: jest.fn(),
}));

import { POST } from "@/app/api/balance/sync/route";

function request(): NextRequest {
  return new NextRequest("http://localhost/api/balance/sync", {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.10" },
  });
}

describe("POST /api/balance/sync", () => {
  const oldEnv = process.env;

  beforeEach(() => {
    process.env = { ...oldEnv };
    delete process.env.BALANCE_SYNC_ENABLED;
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({ user: { email: "user@example.com" } });
    mockCheckBalanceSyncLimit.mockResolvedValue({ allowed: true });
    mockGetUserCredentials.mockResolvedValue({});
    mockSyncUserBalances.mockResolvedValue([]);
  });

  afterEach(() => {
    process.env = oldEnv;
  });

  it("returns 401 without a signed-in user", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);

    const res = await POST(request());

    expect(res.status).toBe(401);
  });

  it("returns 429 when the user is rate limited", async () => {
    mockCheckBalanceSyncLimit.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 3600 });

    const res = await POST(request());

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("3600");
  });

  it("does not pretend to sync when automatic balance sync is not configured", async () => {
    const res = await POST(request());
    const body = await res.json();

    expect(res.status).toBe(501);
    expect(body.code).toBe("BALANCE_SYNC_NOT_CONFIGURED");
    expect(mockGetUserCredentials).not.toHaveBeenCalled();
    expect(mockSyncUserBalances).not.toHaveBeenCalled();
  });

  it("syncs balances when explicitly enabled", async () => {
    process.env.BALANCE_SYNC_ENABLED = "true";
    mockGetUserCredentials.mockResolvedValueOnce({
      SINGAPORE: { username: "u", password: "p" },
    });
    mockSyncUserBalances.mockResolvedValueOnce([{ program: "Singapore KrisFlyer", miles: 1000 }]);

    const res = await POST(request());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.balances).toHaveLength(1);
    expect(mockGetUserCredentials).toHaveBeenCalledWith("user@example.com");
    expect(mockSyncUserBalances).toHaveBeenCalledWith("user@example.com", {
      SINGAPORE: { username: "u", password: "p" },
    });
  });
});

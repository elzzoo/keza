import { GET, POST } from "@/app/api/admin/backfill/price-alerts/route";
import { NextRequest, NextResponse } from "next/server";

const mockRateLimitResponse = jest.fn();
const mockHasAdminSession = jest.fn();
const mockHasAdminSecret = jest.fn();
const mockBackfill = jest.fn();
const mockGetParity = jest.fn();
const mockLogError = jest.fn();
const mockRedisGet = jest.fn();

jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: (...args: unknown[]) => mockRateLimitResponse(...args),
}));

jest.mock("@/lib/auth", () => ({
  hasAdminSession: (...args: unknown[]) => mockHasAdminSession(...args),
  hasAdminSecret: (...args: unknown[]) => mockHasAdminSecret(...args),
}));

jest.mock("@/lib/alertsPostgres", () => ({
  backfillPriceAlertsToPostgres: (...args: unknown[]) => mockBackfill(...args),
  getPriceAlertsStoreParity: (...args: unknown[]) => mockGetParity(...args),
}));

jest.mock("@/lib/redis", () => ({
  redis: {
    get: (...args: unknown[]) => mockRedisGet(...args),
  },
}));

jest.mock("@/lib/redisBackup", () => ({
  REDIS_BACKUP_LAST_KEY: "keza:backup:redis:last",
}));

jest.mock("@/lib/logger", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

describe("POST /api/admin/backfill/price-alerts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimitResponse.mockResolvedValue(null);
    mockHasAdminSession.mockReturnValue(true);
    mockHasAdminSecret.mockReturnValue(false);
    mockBackfill.mockResolvedValue({ dryRun: true, scanned: 2, valid: 1, upserted: 0, failed: 0 });
    mockRedisGet.mockResolvedValue(new Date().toISOString());
    mockGetParity.mockResolvedValue({
      redis: { scanned: 2, valid: 1, active: 1 },
      postgres: { total: 1, active: 1 },
      missingInPostgres: [],
      extraInPostgres: [],
      activeMismatch: [],
      inSync: true,
    });
  });

  it("returns Redis/Postgres parity status for authenticated admins", async () => {
    const res = await GET(new NextRequest("http://localhost/api/admin/backfill/price-alerts", { method: "GET" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.inSync).toBe(true);
    expect(data.redis.active).toBe(1);
    expect(mockGetParity).toHaveBeenCalledTimes(1);
  });

  it("rejects unauthenticated parity status requests", async () => {
    mockHasAdminSession.mockReturnValue(false);

    const res = await GET(new NextRequest("http://localhost/api/admin/backfill/price-alerts", { method: "GET" }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.ok).toBe(false);
    expect(mockGetParity).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated requests", async () => {
    mockHasAdminSession.mockReturnValue(false);

    const res = await POST(new NextRequest("http://localhost/api/admin/backfill/price-alerts", { method: "POST" }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.ok).toBe(false);
    expect(mockBackfill).not.toHaveBeenCalled();
  });

  it("returns rate limit responses before auth", async () => {
    mockRateLimitResponse.mockResolvedValue(
      NextResponse.json({ error: "Too many requests" }, { status: 429 }),
    );

    const res = await POST(new NextRequest("http://localhost/api/admin/backfill/price-alerts", { method: "POST" }));

    expect(res.status).toBe(429);
    expect(mockHasAdminSession).not.toHaveBeenCalled();
    expect(mockBackfill).not.toHaveBeenCalled();
  });

  it("dry-runs by default", async () => {
    const res = await POST(new NextRequest("http://localhost/api/admin/backfill/price-alerts", { method: "POST" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.dryRun).toBe(true);
    expect(mockBackfill).toHaveBeenCalledWith({ dryRun: true });
  });

  it("requires explicit confirmation for write backfills", async () => {
    const res = await POST(new NextRequest("http://localhost/api/admin/backfill/price-alerts?dryRun=false", { method: "POST" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("CONFIRMATION_REQUIRED");
    expect(mockBackfill).not.toHaveBeenCalled();
    expect(mockRedisGet).not.toHaveBeenCalled();
  });

  it("requires a fresh Redis backup before write backfills", async () => {
    mockRedisGet.mockResolvedValue(null);

    const res = await POST(
      new NextRequest("http://localhost/api/admin/backfill/price-alerts?dryRun=false&confirm=BACKFILL_PRICE_ALERTS", {
        method: "POST",
      }),
    );
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.code).toBe("FRESH_BACKUP_REQUIRED");
    expect(data.lastBackupAt).toBeNull();
    expect(mockRedisGet).toHaveBeenCalledWith("keza:backup:redis:last");
    expect(mockBackfill).not.toHaveBeenCalled();
  });

  it("runs the write backfill only when dryRun=false, confirmation is explicit, and a fresh backup exists", async () => {
    mockBackfill.mockResolvedValue({ dryRun: false, scanned: 2, valid: 1, upserted: 1, failed: 0 });

    const res = await POST(
      new NextRequest("http://localhost/api/admin/backfill/price-alerts?dryRun=false&confirm=BACKFILL_PRICE_ALERTS", {
        method: "POST",
      }),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.dryRun).toBe(false);
    expect(data.upserted).toBe(1);
    expect(mockRedisGet).toHaveBeenCalledWith("keza:backup:redis:last");
    expect(mockBackfill).toHaveBeenCalledWith({ dryRun: false });
  });
});

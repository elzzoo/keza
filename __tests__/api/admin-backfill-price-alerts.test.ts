import { POST } from "@/app/api/admin/backfill/price-alerts/route";
import { NextRequest, NextResponse } from "next/server";

const mockRateLimitResponse = jest.fn();
const mockHasAdminSession = jest.fn();
const mockHasAdminSecret = jest.fn();
const mockBackfill = jest.fn();
const mockLogError = jest.fn();

jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: (...args: unknown[]) => mockRateLimitResponse(...args),
}));

jest.mock("@/lib/auth", () => ({
  hasAdminSession: (...args: unknown[]) => mockHasAdminSession(...args),
  hasAdminSecret: (...args: unknown[]) => mockHasAdminSecret(...args),
}));

jest.mock("@/lib/alertsPostgres", () => ({
  backfillPriceAlertsToPostgres: (...args: unknown[]) => mockBackfill(...args),
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

  it("runs the write backfill only when dryRun=false", async () => {
    mockBackfill.mockResolvedValue({ dryRun: false, scanned: 2, valid: 1, upserted: 1, failed: 0 });

    const res = await POST(new NextRequest("http://localhost/api/admin/backfill/price-alerts?dryRun=false", { method: "POST" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.dryRun).toBe(false);
    expect(data.upserted).toBe(1);
    expect(mockBackfill).toHaveBeenCalledWith({ dryRun: false });
  });
});

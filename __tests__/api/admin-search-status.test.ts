import { NextRequest } from "next/server";

const mockHasAdminSession = jest.fn();
const mockHasAdminSecret = jest.fn();
const mockRateLimitResponse = jest.fn();
const mockGetSearchObservabilitySummary = jest.fn();

jest.mock("@/lib/auth", () => ({
  hasAdminSession: (...args: unknown[]) => mockHasAdminSession(...args),
  hasAdminSecret: (...args: unknown[]) => mockHasAdminSecret(...args),
}));

jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: (...args: unknown[]) => mockRateLimitResponse(...args),
}));

jest.mock("@/lib/searchObservability", () => ({
  getSearchObservabilitySummary: (...args: unknown[]) => mockGetSearchObservabilitySummary(...args),
}));

jest.mock("@/lib/logger", () => ({
  logError: jest.fn(),
}));

import { GET } from "@/app/api/admin/search/status/route";

describe("GET /api/admin/search/status", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimitResponse.mockResolvedValue(null);
    mockHasAdminSession.mockReturnValue(false);
    mockHasAdminSecret.mockReturnValue(true);
    mockGetSearchObservabilitySummary.mockResolvedValue({
      days: [],
      totals: { searches: 0, partial: 0, cacheHits: 0, empty: 0 },
      fetchedAt: "2026-09-24T00:00:00.000Z",
    });
  });

  it("rejects unauthenticated requests", async () => {
    mockHasAdminSecret.mockReturnValue(false);

    const res = await GET(new NextRequest("http://localhost/api/admin/search/status"));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, error: "Unauthorized" });
  });

  it("returns search observability summary for authenticated admins", async () => {
    const res = await GET(new NextRequest("http://localhost/api/admin/search/status?days=3"));

    expect(res.status).toBe(200);
    expect(mockGetSearchObservabilitySummary).toHaveBeenCalledWith(3);
    expect(await res.json()).toEqual({
      ok: true,
      days: [],
      totals: { searches: 0, partial: 0, cacheHits: 0, empty: 0 },
      fetchedAt: "2026-09-24T00:00:00.000Z",
    });
  });
});

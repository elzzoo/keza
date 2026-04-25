const mockGetAllActiveRoutes = jest.fn();
const mockGetAlertsByRoute = jest.fn();
const mockSendOnboardingJ3Email = jest.fn();
const mockSendOnboardingJ7Email = jest.fn();
const mockFetchCalendarPrices = jest.fn();
const mockRedisExists = jest.fn();
const mockRedisSet = jest.fn();

jest.mock("@/lib/alerts", () => ({
  getAllActiveRoutes: (...args: unknown[]) => mockGetAllActiveRoutes(...args),
  getAlertsByRoute: (...args: unknown[]) => mockGetAlertsByRoute(...args),
  sendOnboardingJ3Email: (...args: unknown[]) => mockSendOnboardingJ3Email(...args),
  sendOnboardingJ7Email: (...args: unknown[]) => mockSendOnboardingJ7Email(...args),
}));

jest.mock("@/lib/engine", () => ({
  fetchCalendarPrices: (...args: unknown[]) => mockFetchCalendarPrices(...args),
}));

jest.mock("@/lib/redis", () => ({
  redis: {
    exists: (...args: unknown[]) => mockRedisExists(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
  },
}));

jest.mock("@/lib/logger", () => ({
  logError: jest.fn(),
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/cron/onboarding/route";

const OLD_ENV = process.env;

function makeRequest(secret?: string): NextRequest {
  return new NextRequest("http://localhost/api/cron/onboarding", {
    headers: secret ? { authorization: `Bearer ${secret}` } : undefined,
  });
}

const BASE_ALERT = {
  id: "alt_onboard_test",
  email: "user@example.com",
  from: "DSS",
  to: "CDG",
  cabin: "economy" as const,
  basePrice: 600,
  targetPrice: 450,
  notifCount: 0,
  notifFrequency: "instant" as const,
  active: true,
};

describe("GET /api/cron/onboarding", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV, CRON_SECRET: "test-cron-secret" };
    // Default: not yet sent
    mockRedisExists.mockResolvedValue(0);
    mockRedisSet.mockResolvedValue("OK");
    mockFetchCalendarPrices.mockResolvedValue([]);
    mockGetAllActiveRoutes.mockResolvedValue(["DSS:CDG"]);
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("returns 401 when no secret is provided", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("sends J3 email and sets Redis flag for alert in 72h window", async () => {
    const createdAt = new Date(Date.now() - 72 * 3600 * 1000).toISOString();
    mockGetAlertsByRoute.mockResolvedValue([{ ...BASE_ALERT, createdAt }]);
    mockFetchCalendarPrices
      .mockResolvedValueOnce([{ date: "2026-04-10", price: 400, stops: 0 }])
      .mockResolvedValueOnce([{ date: "2026-05-10", price: 500, stops: 0 }]);
    mockSendOnboardingJ3Email.mockResolvedValue(true);

    const res = await GET(makeRequest("test-cron-secret"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.j3Sent).toBe(1);
    expect(body.j7Sent).toBe(0);
    expect(mockSendOnboardingJ3Email).toHaveBeenCalledWith(
      expect.objectContaining({ id: "alt_onboard_test" }),
      400 // economy multiplier = 1.0, min(400,500) = 400
    );
    expect(mockRedisSet).toHaveBeenCalledWith(
      "keza:onboarding:alt_onboard_test:j3",
      "1",
      expect.objectContaining({ ex: 30 * 86400 })
    );
  });

  it("sends J7 email and sets Redis flag for alert in 168h window", async () => {
    const createdAt = new Date(Date.now() - 168 * 3600 * 1000).toISOString();
    mockGetAlertsByRoute.mockResolvedValue([{ ...BASE_ALERT, createdAt }]);
    mockSendOnboardingJ7Email.mockResolvedValue(true);

    const res = await GET(makeRequest("test-cron-secret"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.j7Sent).toBe(1);
    expect(body.j3Sent).toBe(0);
    expect(mockSendOnboardingJ7Email).toHaveBeenCalledWith(
      expect.objectContaining({ id: "alt_onboard_test" })
    );
    expect(mockRedisSet).toHaveBeenCalledWith(
      "keza:onboarding:alt_onboard_test:j7",
      "1",
      expect.objectContaining({ ex: 30 * 86400 })
    );
  });

  it("sends no emails for alert only 24h old (outside both windows)", async () => {
    const createdAt = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    mockGetAlertsByRoute.mockResolvedValue([{ ...BASE_ALERT, createdAt }]);

    const res = await GET(makeRequest("test-cron-secret"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.j3Sent).toBe(0);
    expect(body.j7Sent).toBe(0);
    expect(mockSendOnboardingJ3Email).not.toHaveBeenCalled();
    expect(mockSendOnboardingJ7Email).not.toHaveBeenCalled();
  });

  it("skips J3 email if Redis flag already set (dedup)", async () => {
    const createdAt = new Date(Date.now() - 72 * 3600 * 1000).toISOString();
    mockGetAlertsByRoute.mockResolvedValue([{ ...BASE_ALERT, createdAt }]);
    // Already sent
    mockRedisExists.mockResolvedValue(1);

    const res = await GET(makeRequest("test-cron-secret"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.j3Sent).toBe(0);
    expect(mockSendOnboardingJ3Email).not.toHaveBeenCalled();
  });
});

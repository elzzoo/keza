const mockGetAllActiveRoutes = jest.fn();
const mockGetAlertsByRoute = jest.fn();
const mockUpdateAlertAfterCheck = jest.fn();
const mockSendPriceDropEmail = jest.fn();
const mockSendPushToAll = jest.fn();
const mockFetchCalendarPrices = jest.fn();

jest.mock("@/lib/alerts", () => ({
  getAllActiveRoutes: (...args: unknown[]) => mockGetAllActiveRoutes(...args),
  getAlertsByRoute: (...args: unknown[]) => mockGetAlertsByRoute(...args),
  updateAlertAfterCheck: (...args: unknown[]) => mockUpdateAlertAfterCheck(...args),
  sendPriceDropEmail: (...args: unknown[]) => mockSendPriceDropEmail(...args),
}));

jest.mock("@/lib/push", () => ({
  sendPushToAll: (...args: unknown[]) => mockSendPushToAll(...args),
}));

jest.mock("@/lib/engine", () => ({
  fetchCalendarPrices: (...args: unknown[]) => mockFetchCalendarPrices(...args),
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/cron/alerts/route";

const OLD_ENV = process.env;

function makeRequest(secret?: string): NextRequest {
  return new NextRequest("http://localhost/api/cron/alerts", {
    headers: secret ? { authorization: `Bearer ${secret}` } : undefined,
  });
}

describe("GET /api/cron/alerts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV, CRON_SECRET: "test-cron-secret" };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("requires CRON_SECRET bearer authorization", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("uses CalendarDay.price values and sends an alert when price is below target", async () => {
    mockGetAllActiveRoutes.mockResolvedValue(["DSS:CDG"]);
    mockGetAlertsByRoute.mockResolvedValue([
      {
        id: "alt_test",
        email: "user@example.com",
        from: "DSS",
        to: "CDG",
        cabin: "economy",
        basePrice: 600,
        targetPrice: 450,
        createdAt: "2026-04-01T00:00:00.000Z",
        lastCheckedAt: "2026-04-20T00:00:00.000Z",
        notifCount: 0,
        notifFrequency: "instant" as const,
        active: true,
      },
    ]);
    mockFetchCalendarPrices
      .mockResolvedValueOnce([
        { date: "2026-04-10", price: 500, stops: 0 },
        { date: "2026-04-11", price: 400, stops: 1 },
      ])
      .mockResolvedValueOnce([{ date: "2026-05-10", price: 550, stops: 0 }]);
    mockSendPriceDropEmail.mockResolvedValue(true);
    mockUpdateAlertAfterCheck.mockResolvedValue(undefined);
    mockSendPushToAll.mockResolvedValue(1);

    const res = await GET(makeRequest("test-cron-secret"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.checked).toBe(1);
    expect(body.notified).toBe(1);
    expect(mockSendPriceDropEmail).toHaveBeenCalledWith(
      expect.objectContaining({ id: "alt_test" }),
      400
    );
    expect(mockUpdateAlertAfterCheck).toHaveBeenCalledWith("alt_test", 400, true);
  });
});

// __tests__/api/cron-seat-alerts.test.ts

const mockProcessAllSeatAlerts = jest.fn();

jest.mock("@/lib/seatAlerts", () => ({
  processAllSeatAlerts: (...args: unknown[]) =>
    mockProcessAllSeatAlerts(...args),
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/cron/seat-alerts/route";

const OLD_ENV = process.env;

function makeRequest(secret?: string): NextRequest {
  return new NextRequest("http://localhost/api/cron/seat-alerts", {
    headers: secret ? { authorization: `Bearer ${secret}` } : undefined,
  });
}

describe("GET /api/cron/seat-alerts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV, CRON_SECRET: "test-cron-secret" };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("rejects requests without valid cron secret", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns summary of alerts checked and notified", async () => {
    mockProcessAllSeatAlerts.mockResolvedValue({
      checked: 5,
      notified: 2,
      errors: [],
    });

    const res = await GET(makeRequest("test-cron-secret"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty("checked");
    expect(data).toHaveProperty("notified");
    expect(data.checked).toBe(5);
    expect(data.notified).toBe(2);
    expect(data).toHaveProperty("success", true);
    expect(data).toHaveProperty("timestamp");
  });

  it("returns 500 on internal error", async () => {
    mockProcessAllSeatAlerts.mockRejectedValue(
      new Error("Redis connection failed")
    );

    const res = await GET(makeRequest("test-cron-secret"));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data).toHaveProperty("error");
  });
});

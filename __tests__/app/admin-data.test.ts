const mockRedisLrange = jest.fn();
const mockGetPriceAlertsStoreParity = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: {
    lrange: (...args: unknown[]) => mockRedisLrange(...args),
  },
}));

jest.mock("@/lib/alertsPostgres", () => ({
  getPriceAlertsStoreParity: (...args: unknown[]) => mockGetPriceAlertsStoreParity(...args),
}));

import { fetchB2BLeads, fetchPriceAlertsParityStatus } from "@/app/admin/data";

describe("admin data helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("parses B2B leads and ignores malformed Redis entries", async () => {
    mockRedisLrange.mockResolvedValue([
      JSON.stringify({
        name: "Ada",
        company: "Acme",
        email: "ada@example.com",
        teamSize: "10",
        receivedAt: "2026-09-25T08:00:00.000Z",
      }),
      "{bad json",
      {
        name: "Grace",
        company: "Orbit",
        email: "grace@example.com",
        teamSize: "25",
        receivedAt: "2026-09-25T09:00:00.000Z",
      },
    ]);

    await expect(fetchB2BLeads()).resolves.toEqual([
      {
        name: "Ada",
        company: "Acme",
        email: "ada@example.com",
        teamSize: "10",
        receivedAt: "2026-09-25T08:00:00.000Z",
      },
      {
        name: "Grace",
        company: "Orbit",
        email: "grace@example.com",
        teamSize: "25",
        receivedAt: "2026-09-25T09:00:00.000Z",
      },
    ]);
    expect(mockRedisLrange).toHaveBeenCalledWith("keza:b2b:leads", 0, 49);
  });

  it("wraps alert parity success and errors for the admin page", async () => {
    const parity = {
      redis: { scanned: 1, valid: 1, active: 1 },
      postgres: { total: 1, active: 1 },
      missingInPostgres: [],
      extraInPostgres: [],
      activeMismatch: [],
      inSync: true,
    };
    mockGetPriceAlertsStoreParity.mockResolvedValueOnce(parity);
    await expect(fetchPriceAlertsParityStatus()).resolves.toEqual({ ok: true, data: parity });

    mockGetPriceAlertsStoreParity.mockRejectedValueOnce(new Error("db unavailable"));
    await expect(fetchPriceAlertsParityStatus()).resolves.toEqual({
      ok: false,
      error: "db unavailable",
    });
  });
});

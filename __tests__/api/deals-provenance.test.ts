const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockFetch = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: {
    get: (...args: unknown[]) => mockRedisGet(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
  },
}));
jest.mock("@/lib/ratelimit", () => ({ rateLimitResponse: jest.fn(async () => null) }));
jest.mock("@/lib/auth", () => ({ hasCronSecret: jest.fn(() => true) }));
jest.mock("@sentry/nextjs", () => ({ withMonitor: (_name: string, fn: () => unknown) => fn() }));

import { DEALS_KEY } from "@/lib/redisKeys";
import { GET as getDeals } from "@/app/api/deals/route";
import { GET as runDealsCron } from "@/app/api/cron/deals/route";

describe("deal provenance", () => {
  const oldToken = process.env.TRAVELPAYOUTS_TOKEN;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TRAVELPAYOUTS_TOKEN = "test-token";
    mockRedisSet.mockResolvedValue("OK");
    mockRedisGet.mockResolvedValue(null);
    global.fetch = mockFetch;
  });

  afterAll(() => {
    if (oldToken === undefined) delete process.env.TRAVELPAYOUTS_TOKEN;
    else process.env.TRAVELPAYOUTS_TOKEN = oldToken;
  });

  it("stores finite monthly supplier prices with provenance for the daily cache window", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ price: Number.NaN }, { price: 680 }, { price: 700 }] }),
    });

    const response = await runDealsCron(new Request("http://localhost/api/cron/deals"));
    expect(response.status).toBe(200);
    const [key, stored, options] = mockRedisSet.mock.calls.find(([key]) => key === DEALS_KEY)!;
    expect(key).toBe(DEALS_KEY);
    expect(options).toEqual({ ex: 25 * 60 * 60 });
    expect(stored).toEqual(expect.arrayContaining([
      expect.objectContaining({
        cashPrice: 680,
        cashSource: "travelpayouts-month-matrix",
        cashSearchMonth: expect.stringMatching(/^\d{4}-(0[1-9]|1[0-2])$/),
        cashCheckedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      }),
    ]));
    expect(mockFetch).toHaveBeenCalledTimes(10);
  });

  it("marks API fallbacks as examples and old cache entries as cache, not live", async () => {
    const fallback = await getDeals(new Request("http://localhost/api/deals"));
    const fallbackBody = await fallback.json();
    expect(fallbackBody.source).toBe("fallback");
    expect(fallbackBody.deals.every((deal: { cashSource?: string }) => deal.cashSource === "static-example")).toBe(true);

    mockRedisGet.mockResolvedValueOnce([{ from: "DSS", to: "CDG", cashPrice: 680 }]);
    const cached = await getDeals(new Request("http://localhost/api/deals"));
    const cachedBody = await cached.json();
    expect(cachedBody.source).toBe("cache");
    expect(cachedBody.deals[0].cashSource).toBeUndefined();
  });
});

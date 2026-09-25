// __tests__/lib/duffelProvider.test.ts
// Tests for pure helpers and FX rate logic in lib/duffelProvider.ts

const mockRedisGet = jest.fn();
const mockRedisSetex = jest.fn();
const mockLogError = jest.fn();
const mockLogWarn = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: {
    get: (...args: unknown[]) => mockRedisGet(...args),
    setex: (...args: unknown[]) => mockRedisSetex(...args),
  },
}));

jest.mock("@/lib/logger", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
  logWarn: (...args: unknown[]) => mockLogWarn(...args),
}));

import {
  fetchFromDuffel,
  parseDurationMinutes,
  sanitizeDuffelErrorBody,
  toUsd,
} from "@/lib/duffelProvider";

beforeEach(() => {
  jest.clearAllMocks();
  // Reset the module-level cache between tests
  jest.resetModules();
  mockRedisGet.mockResolvedValue(null);
  mockRedisSetex.mockResolvedValue("OK");
  process.env.DUFFEL_API_KEY = "duffel_test_local";
  global.fetch = jest.fn();
});

afterEach(() => {
  delete process.env.DUFFEL_API_KEY;
});

// ─── parseDurationMinutes ─────────────────────────────────────────────────────

describe("parseDurationMinutes", () => {
  it("parses PT6H30M correctly", () => {
    expect(parseDurationMinutes("PT6H30M")).toBe(390);
  });

  it("parses PT2H correctly (no minutes)", () => {
    expect(parseDurationMinutes("PT2H")).toBe(120);
  });

  it("parses PT45M correctly (no hours)", () => {
    expect(parseDurationMinutes("PT45M")).toBe(45);
  });

  it("returns 0 for empty string", () => {
    expect(parseDurationMinutes("")).toBe(0);
  });

  it("returns 0 for malformed input", () => {
    expect(parseDurationMinutes("not-a-duration")).toBe(0);
  });

  it("parses PT14H55M for long-haul flight", () => {
    expect(parseDurationMinutes("PT14H55M")).toBe(895);
  });
});

// ─── toUsd — FX conversion ────────────────────────────────────────────────────

describe("toUsd", () => {
  it("returns the same value for USD (1.0 rate)", async () => {
    // USD is always 1.0 regardless of Redis state
    const result = await toUsd("500", "USD");
    expect(result).toBe(500);
  });

  it("uses fallback rate for EUR when Redis is empty", async () => {
    mockRedisGet.mockResolvedValue(null);
    // EUR fallback = 1.08 → 100 EUR = ~108 USD
    const result = await toUsd("100", "EUR");
    expect(result).toBeCloseTo(108, 0);
  });

  it("uses fallback rate for XOF when Redis is empty", async () => {
    mockRedisGet.mockResolvedValue(null);
    // XOF fallback = 0.00165 → 100,000 XOF ≈ 165 USD
    const result = await toUsd("100000", "XOF");
    expect(result).toBeCloseTo(165, 0);
  });

  it("uses live Redis rates when available", async () => {
    // Redis stores rates FROM USD (e.g. EUR: 0.92 means 1 USD = 0.92 EUR)
    // toUsd inverts: 1 EUR = 1/0.92 ≈ 1.087 USD
    // Must have > 5 keys to pass the validity check in getFxRates()
    mockRedisGet.mockResolvedValue({
      USD: 1.0,
      EUR: 0.92,
      GBP: 0.79,
      XOF: 605,
      CAD: 1.36,
      AUD: 1.53,
    });
    const result = await toUsd("100", "EUR");
    // Live rate: 1/0.92 ≈ 1.087 → 100 EUR ≈ 108.7 USD, rounded to 2dp = 108.7
    expect(result).toBe(Math.round((100 / 0.92) * 100) / 100);
  });

  it("returns null for unknown currency", async () => {
    mockRedisGet.mockResolvedValue(null);
    const result = await toUsd("100", "ZZZ");
    expect(result).toBeNull();
  });

  it("handles numeric amount input", async () => {
    mockRedisGet.mockResolvedValue(null);
    const result = await toUsd(500, "USD");
    expect(result).toBe(500);
  });

  it("returns null for zero amount with unknown currency", async () => {
    mockRedisGet.mockResolvedValue(null);
    const result = await toUsd("0", "XYZ");
    expect(result).toBeNull();
  });
});

// ─── sanitizeDuffelErrorBody ─────────────────────────────────────────────────

describe("sanitizeDuffelErrorBody", () => {
  it("removes bearer tokens, JSON secrets, query params, and provider key patterns", () => {
    const result = sanitizeDuffelErrorBody(
      [
        'Authorization: Bearer sk_live_supersecret',
        '{"token":"duffel_live_hidden","api_key":"plain-secret"}',
        "https://example.test/?api_key=another-secret&safe=1",
      ].join(" ")
    );

    expect(result).toContain("*** ***");
    expect(result).toContain('"token":"***"');
    expect(result).toContain('"api_key":"***"');
    expect(result).toContain("api_key=***");
    expect(result).not.toContain("sk_live_supersecret");
    expect(result).not.toContain("duffel_live_hidden");
    expect(result).not.toContain("plain-secret");
    expect(result).not.toContain("another-secret");
  });
});

// ─── fetchFromDuffel — failure hardening ─────────────────────────────────────

describe("fetchFromDuffel", () => {
  it("returns [] without calling Duffel when the API key is missing", async () => {
    delete process.env.DUFFEL_API_KEY;

    await expect(fetchFromDuffel("CDG", "JFK", "2026-10-10")).resolves.toEqual([]);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("sanitizes non-OK error bodies before logging them", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(new Response("temporary server error", { status: 500 }))
      .mockResolvedValueOnce(
        new Response('{"Authorization":"Bearer sk_live_secret","token":"duffel_live_secret"}', {
          status: 500,
        })
      );

    await expect(fetchFromDuffel("CDG", "JFK", "2026-10-10")).resolves.toEqual([]);

    const logged = mockLogError.mock.calls.map((call) => call.join(" ")).join("\n");
    expect(logged).toContain("[duffel] 500");
    expect(logged).not.toContain("sk_live_secret");
    expect(logged).not.toContain("duffel_live_secret");
  });

  it("logs retry-after context for 429 responses and falls back cleanly", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response('{"error":"rate limited"}', {
        status: 429,
        headers: { "Retry-After": "17" },
      })
    );

    await expect(fetchFromDuffel("CDG", "JFK", "2026-10-10")).resolves.toEqual([]);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(mockLogWarn).toHaveBeenCalledWith(
      "[duffel] rate limited (retry after 17s), falling back to Travelpayouts"
    );
  });

  it("returns [] for invalid JSON responses", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(new Response("not-json", { status: 200 }));

    await expect(fetchFromDuffel("CDG", "JFK", "2026-10-10")).resolves.toEqual([]);

    expect(mockLogError).toHaveBeenCalledWith("[duffel] invalid JSON response for CDG→JFK");
  });

  it("returns [] when the response has no offers array", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      Response.json({ data: { offers: null } }, { status: 200 })
    );

    await expect(fetchFromDuffel("CDG", "JFK", "2026-10-10")).resolves.toEqual([]);

    expect(mockLogWarn).toHaveBeenCalledWith(
      "[duffel] invalid response structure for CDG→JFK: offers is not an array"
    );
  });

  it("skips malformed offers but keeps valid offers", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      Response.json({
        data: {
          offers: [
            { total_amount: "400", total_currency: "USD", slices: [] },
            {
              id: "off_valid",
              total_amount: "500",
              total_currency: "USD",
              slices: [
                {
                  duration: "PT8H10M",
                  segments: [
                    {
                      operating_carrier: { iata_code: "AF" },
                      departing_at: "2026-10-10T10:00:00",
                      arriving_at: "2026-10-10T18:10:00",
                    },
                  ],
                },
              ],
            },
          ],
        },
      })
    );

    await expect(fetchFromDuffel("CDG", "JFK", "2026-10-10")).resolves.toEqual([
      {
        from: "CDG",
        to: "JFK",
        price: 500,
        airlines: ["Air France"],
        stops: 0,
        duration: 490,
      },
    ]);
  });
});

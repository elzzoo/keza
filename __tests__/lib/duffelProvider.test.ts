// __tests__/lib/duffelProvider.test.ts
// Tests for pure helpers and FX rate logic in lib/duffelProvider.ts

const mockRedisGet = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: {
    get: (...args: unknown[]) => mockRedisGet(...args),
  },
}));

import { parseDurationMinutes, toUsd } from "@/lib/duffelProvider";

beforeEach(() => {
  jest.clearAllMocks();
  // Reset the module-level cache between tests
  jest.resetModules();
  mockRedisGet.mockResolvedValue(null);
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

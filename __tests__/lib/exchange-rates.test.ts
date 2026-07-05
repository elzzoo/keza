const mockGet = jest.fn();
const mockSet = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: {
    get: mockGet,
    set: mockSet,
  },
}));

jest.mock("@/lib/logger");

import { getCachedRates, updateRatesInCache } from "@/lib/exchange-rates";

describe("Exchange Rate Caching", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getCachedRates returns object with currency keys", async () => {
    const rates = await getCachedRates();
    expect(typeof rates).toBe("object");
    expect(Object.keys(rates).length).toBeGreaterThan(0);
  });

  test("rates include major currencies", async () => {
    const rates = await getCachedRates();
    expect(rates.EUR).toBeDefined();
    expect(rates.GBP).toBeDefined();
    expect(rates.XOF).toBeDefined();
  });

  test("all rates are positive numbers", async () => {
    const rates = await getCachedRates();
    Object.values(rates).forEach((rate) => {
      expect(typeof rate).toBe("number");
      expect(rate).toBeGreaterThan(0);
    });
  });

  test("getCachedRates returns cached rates from Redis when available", async () => {
    const cachedRates = {
      EUR: 0.95,
      GBP: 0.80,
      XOF: 660.0,
    };
    mockGet.mockResolvedValue(cachedRates);

    const rates = await getCachedRates();
    expect(rates).toEqual(cachedRates);
    expect(mockGet).toHaveBeenCalledWith("keza:exchange-rates");
  });

  test("getCachedRates falls back to defaults when Redis is empty", async () => {
    mockGet.mockResolvedValue(null);

    const rates = await getCachedRates();
    expect(rates.EUR).toBeDefined();
    expect(rates.GBP).toBeDefined();
    expect(rates.XOF).toBeDefined();
  });

  test("getCachedRates falls back to defaults on Redis error", async () => {
    mockGet.mockRejectedValue(new Error("Redis error"));

    const rates = await getCachedRates();
    expect(rates.EUR).toBeDefined();
    expect(rates.GBP).toBeDefined();
    expect(rates.XOF).toBeDefined();
  });

  test("updateRatesInCache stores rates in Redis with TTL", async () => {
    mockSet.mockResolvedValue("OK");
    const newRates = { EUR: 0.95, GBP: 0.80, XOF: 660.0 };

    await updateRatesInCache(newRates);

    expect(mockSet).toHaveBeenCalledWith(
      "keza:exchange-rates",
      JSON.stringify(newRates),
      { ex: 24 * 60 * 60 }
    );
  });

  test("updateRatesInCache handles Redis errors gracefully", async () => {
    mockSet.mockRejectedValue(new Error("Redis error"));
    const newRates = { EUR: 0.95, GBP: 0.80, XOF: 660.0 };

    // Should not throw
    await expect(updateRatesInCache(newRates)).resolves.not.toThrow();
  });
});

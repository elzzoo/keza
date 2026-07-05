/**
 * __tests__/performance/currency-conversion.perf.test.ts
 *
 * Performance tests for currency conversion engine.
 *
 * Targets:
 * - Single conversion: <1ms
 * - 1000 conversions: <50ms total (<0.05ms per conversion)
 * - Supports 20+ currency pairs at scale
 *
 * These are critical for real-time price updates in flight results.
 */

import { convertPrice } from "@/lib/convertCurrency";

describe("Currency Conversion Performance", () => {
  const rates = {
    EUR: 0.92,
    GBP: 0.79,
    JPY: 152.5,
    SGD: 1.35,
    XOF: 656.5,
    CAD: 1.36,
    AUD: 1.51,
    CHF: 0.89,
    CNY: 7.24,
    INR: 83.12,
    KRW: 1319.5,
    HKD: 7.81,
    NZD: 1.63,
    BRL: 4.97,
    MXN: 17.05,
    ZAR: 18.47,
    AED: 3.67,
    THB: 34.55,
    MYR: 4.73,
    PHP: 56.25,
  };

  test("single conversion completes in under 1ms", () => {
    const start = performance.now();
    const result = convertPrice(500, "USD", "EUR", rates);
    const duration = performance.now() - start;

    expect(result).toBeCloseTo(460, 0); // 500 * 0.92
    expect(duration).toBeLessThan(1);
  });

  test("converts 1000 prices in under 50ms total", () => {
    const start = performance.now();
    let total = 0;

    for (let i = 0; i < 1000; i++) {
      total += convertPrice(Math.random() * 10000, "USD", "EUR", rates);
    }

    const duration = performance.now() - start;

    expect(total).toBeGreaterThan(0); // Sanity check
    expect(duration).toBeLessThan(50);

    // Log for benchmark tracking
    console.log(`1000 conversions USD→EUR: ${duration.toFixed(2)}ms (avg ${(duration / 1000).toFixed(4)}ms each)`);
  });

  test("batch conversion across multiple currency pairs", () => {
    const currencyPairs = [
      ["USD", "EUR"],
      ["USD", "GBP"],
      ["USD", "JPY"],
      ["USD", "SGD"],
      ["USD", "XOF"],
      ["EUR", "GBP"],
      ["GBP", "JPY"],
      ["JPY", "SGD"],
      ["SGD", "XOF"],
      ["XOF", "EUR"],
    ];

    const price = 1500;
    const start = performance.now();

    const results = currencyPairs.map(([from, to]) => ({
      pair: `${from}→${to}`,
      result: convertPrice(price, from as string, to as string, rates),
    }));

    const duration = performance.now() - start;

    expect(results.length).toBe(10);
    expect(results.every((r) => r.result > 0)).toBe(true);
    expect(duration).toBeLessThan(5); // 10 conversions should take <<1ms

    console.log(`10 cross-currency pairs: ${duration.toFixed(2)}ms`);
  });

  test("handles high-volume flight price conversions", () => {
    // Simulate converting prices for 100 flights across 5 currency choices
    const flightCount = 100;
    const currencyChoices = ["USD", "EUR", "GBP", "JPY", "SGD"];
    const basePrice = 1500;

    const start = performance.now();

    for (let f = 0; f < flightCount; f++) {
      for (const currency of currencyChoices) {
        convertPrice(basePrice, "USD", currency, rates);
      }
    }

    const duration = performance.now() - start;
    const conversionsPerMs = (flightCount * currencyChoices.length) / duration;

    expect(duration).toBeLessThan(100); // 500 conversions in <100ms
    console.log(`${flightCount} flights × ${currencyChoices.length} currencies: ${duration.toFixed(2)}ms (${conversionsPerMs.toFixed(0)} conversions/ms)`);
  });

  test("non-USD base currency conversions", () => {
    const start = performance.now();
    let count = 0;

    // Test conversions from various base currencies
    const baseStart = 100;
    for (let i = 0; i < 100; i++) {
      convertPrice(baseStart, "EUR", "GBP", rates);
      convertPrice(baseStart, "GBP", "JPY", rates);
      convertPrice(baseStart, "JPY", "SGD", rates);
      count += 3;
    }

    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10); // 300 non-USD conversions
    console.log(`${count} non-USD conversions: ${duration.toFixed(2)}ms`);
  });

  test("same-currency conversion is optimized (zero overhead)", () => {
    const iterations = 10000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      convertPrice(1000, "USD", "USD", rates);
    }

    const duration = performance.now() - start;

    // Same-currency should be essentially free (early return)
    expect(duration).toBeLessThan(5); // 10k same-currency conversions should be instant
    console.log(`${iterations} same-currency conversions: ${duration.toFixed(2)}ms`);
  });

  test("missing exchange rate fallback is fast", () => {
    const emptyRates = {};
    const iterations = 1000;

    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      convertPrice(1000, "USD", "XYZ", emptyRates);
    }

    const duration = performance.now() - start;

    expect(duration).toBeLessThan(5); // Fallback should be instant
    console.log(`${iterations} missing-rate fallbacks: ${duration.toFixed(2)}ms`);
  });

  test("rounding precision doesn't impact performance", () => {
    const start = performance.now();
    let total = 0;

    // Test with various precision-requiring numbers
    const testValues = [
      { amount: 1234.567, from: "USD", to: "EUR" },
      { amount: 0.01, from: "USD", to: "GBP" },
      { amount: 99999.99, from: "USD", to: "JPY" },
      { amount: 0.001, from: "EUR", to: "GBP" },
      { amount: 123456.789, from: "GBP", to: "JPY" },
    ];

    for (let i = 0; i < 200; i++) {
      for (const test of testValues) {
        total += convertPrice(test.amount, test.from, test.to, rates);
      }
    }

    const duration = performance.now() - start;
    const conversions = 200 * testValues.length;

    expect(duration).toBeLessThan(15); // 1000 precision-heavy conversions
    console.log(`${conversions} precision-heavy conversions: ${duration.toFixed(2)}ms`);
  });

  test("all 20+ supported currencies can be converted", () => {
    const supportedCurrencies = Object.keys(rates);
    expect(supportedCurrencies.length).toBeGreaterThanOrEqual(20);

    const basePrice = 1000;
    const start = performance.now();

    // Convert from USD to all supported currencies
    const results = supportedCurrencies.map((currency) => convertPrice(basePrice, "USD", currency, rates));

    const duration = performance.now() - start;

    expect(results.every((r) => r > 0)).toBe(true);
    expect(duration).toBeLessThan(10); // All conversions together

    console.log(`Converting USD to ${supportedCurrencies.length} currencies: ${duration.toFixed(2)}ms`);
  });

  test("memory efficiency: no allocation bloat from repeated conversions", () => {
    // This is a soft test - just verify no crash or exponential slowdown
    const iterations = 5000;

    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      convertPrice(Math.random() * 100000, "USD", "EUR", rates);
    }

    const duration = performance.now() - start;

    // Should scale linearly, not exponentially
    expect(duration).toBeLessThan(100);
    const avgTime = duration / iterations;
    expect(avgTime).toBeLessThan(0.1); // <0.1ms per conversion on average

    console.log(`${iterations} conversions: ${duration.toFixed(2)}ms avg (${avgTime.toFixed(4)}ms each)`);
  });
});

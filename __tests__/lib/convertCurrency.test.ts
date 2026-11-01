import { convertPrice, formatUsdAmount } from "@/lib/convertCurrency";

describe("formatUsdAmount", () => {
  test("uses a valid requested FX rate", () => {
    expect(formatUsdAmount(100, "EUR", { EUR: 0.92 })).toContain("92.00");
    expect(formatUsdAmount(100, "EUR", { EUR: 0.92 })).toContain("€");
  });

  test.each([undefined, 0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "labels the original amount as USD when the requested rate is unusable: %s",
    (rate) => {
      const rates: Record<string, number> = rate === undefined ? {} : { NGN: rate };
      expect(formatUsdAmount(100, "NGN", rates)).toBe("$100.00");
    },
  );
});

describe("convertPrice", () => {
  const rates = { EUR: 0.92, GBP: 0.79, XOF: 656.5 };

  test("converts USD to EUR correctly", () => {
    expect(convertPrice(100, "USD", "EUR", rates)).toBeCloseTo(92, 0);
  });

  test("converts USD to GBP correctly", () => {
    expect(convertPrice(100, "USD", "GBP", rates)).toBeCloseTo(79, 0);
  });

  test("returns same value if currencies match", () => {
    expect(convertPrice(100, "USD", "USD", rates)).toBe(100);
  });

  test("handles missing rates gracefully", () => {
    expect(convertPrice(100, "USD", "XYZ", {})).toBe(100); // fallback to USD
  });

  test("converts EUR to GBP correctly", () => {
    // 100 EUR in USD = 100 / 0.92 = 108.7 USD
    // 108.7 USD in GBP = 108.7 * 0.79 = 85.87 GBP
    expect(convertPrice(100, "EUR", "GBP", rates)).toBeCloseTo(85.87, 1);
  });

  test("converts GBP to USD correctly", () => {
    // 100 GBP in USD = 100 / 0.79 = 126.58 USD
    expect(convertPrice(100, "GBP", "USD", rates)).toBeCloseTo(126.58, 1);
  });

  test("returns amount unchanged if source rate missing", () => {
    // XYZ rate missing
    expect(convertPrice(100, "XYZ", "EUR", rates)).toBe(100);
  });
});

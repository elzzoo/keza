import { convertPrice } from "@/lib/convertCurrency";

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
});

import { roundPrice } from "../../lib/roundPrice";

describe("roundPrice", () => {
  it("rounds to 2 decimal places", () => {
    expect(roundPrice(19.995)).toBe(20.00);
    expect(roundPrice(19.994)).toBe(19.99);
  });

  it("handles already-rounded values", () => {
    expect(roundPrice(100.00)).toBe(100.00);
    expect(roundPrice(99.99)).toBe(99.99);
  });

  it("rounds large values", () => {
    expect(roundPrice(1200.456)).toBe(1200.46);
    expect(roundPrice(5000.126)).toBe(5000.13);
  });

  it("handles small values", () => {
    expect(roundPrice(0.01)).toBe(0.01);
    expect(roundPrice(0.006)).toBe(0.01);
  });

  it("handles zero", () => {
    expect(roundPrice(0)).toBe(0);
  });

  it("handles negative values", () => {
    expect(roundPrice(-19.99)).toBe(-19.99);
    expect(roundPrice(-100.456)).toBe(-100.46);
  });
});

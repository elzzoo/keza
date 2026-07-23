// __tests__/lib/priceHistory.test.ts
import { getMonthlyPrices, getAllDestinationPriceHistories } from "@/lib/priceHistory";
import { DESTINATIONS } from "@/data/destinations";
import { REGIONAL_SEASONALITY } from "@/data/seasonality";

const CDG = DESTINATIONS.find((d) => d.iata === "CDG")!;

describe("getMonthlyPrices", () => {
  it("returns exactly 12 monthly prices", () => {
    const history = getMonthlyPrices(CDG);
    expect(history.monthlyPrices).toHaveLength(12);
  });

  it("each MonthlyPrice has required fields", () => {
    const history = getMonthlyPrices(CDG);
    history.monthlyPrices.forEach((mp, i) => {
      expect(mp.month).toBe(i);
      expect(typeof mp.monthLabel).toBe("string");
      expect(mp.monthLabel.length).toBeGreaterThan(0);
      expect(typeof mp.price).toBe("number");
      expect(typeof mp.cpm).toBe("number");
      expect(["USE_MILES", "NEUTRAL", "USE_CASH"]).toContain(mp.recommendation);
    });
  });

  it("price for CDG January ≈ cashEstimateUsd * europe[0] within ±6% per-destination jitter", () => {
    const history = getMonthlyPrices(CDG);
    const janMultiplier = REGIONAL_SEASONALITY["europe"][0]; // 0.82
    const base = CDG.cashEstimateUsd * janMultiplier;
    // A deterministic ±6% jitter (seeded by IATA code) is applied on top of the
    // regional curve so destinations sharing a region don't render identical
    // monthly price charts. See lib/priceHistory.ts hashUnit().
    expect(history.monthlyPrices[0].price).toBeGreaterThanOrEqual(Math.round(base * 0.94));
    expect(history.monthlyPrices[0].price).toBeLessThanOrEqual(Math.round(base * 1.06));
  });

  it("is deterministic — same destination always yields the same curve", () => {
    const a = getMonthlyPrices(CDG);
    const b = getMonthlyPrices(CDG);
    expect(a.monthlyPrices.map((m) => m.price)).toEqual(b.monthlyPrices.map((m) => m.price));
  });

  it("two destinations in the same region do not render an identical curve", () => {
    const sameRegionPair = DESTINATIONS.filter((d) => d.region === CDG.region && d.iata !== CDG.iata);
    expect(sameRegionPair.length).toBeGreaterThan(0);
    const other = getMonthlyPrices(sameRegionPair[0]);
    const cdgPrices = getMonthlyPrices(CDG).monthlyPrices.map((m) => m.price);
    const otherPrices = other.monthlyPrices.map((m) => m.price);
    // Normalize both to their January value so we compare *shape*, not absolute price level
    const cdgShape = cdgPrices.map((p) => p / cdgPrices[0]);
    const otherShape = otherPrices.map((p) => p / otherPrices[0]);
    expect(cdgShape).not.toEqual(otherShape);
  });

  it("bestMonths contains only months with price <= percentile 33", () => {
    const history = getMonthlyPrices(CDG);
    const prices = history.monthlyPrices.map((m) => m.price);
    const sorted = [...prices].sort((a, b) => a - b);
    const p33 = sorted[Math.floor(sorted.length * 0.33)];
    history.bestMonths.forEach((idx) => {
      expect(history.monthlyPrices[idx].price).toBeLessThanOrEqual(p33);
    });
  });

  it("worstMonths contains only months with price >= percentile 67", () => {
    const history = getMonthlyPrices(CDG);
    const prices = history.monthlyPrices.map((m) => m.price);
    const sorted = [...prices].sort((a, b) => a - b);
    const p67 = sorted[Math.floor(sorted.length * 0.67)];
    history.worstMonths.forEach((idx) => {
      expect(history.monthlyPrices[idx].price).toBeGreaterThanOrEqual(p67);
    });
  });

  it("iata matches the input destination", () => {
    const history = getMonthlyPrices(CDG);
    expect(history.iata).toBe("CDG");
  });
});

describe("getAllDestinationPriceHistories", () => {
  it("returns 42 entries (one per destination)", () => {
    const all = getAllDestinationPriceHistories();
    expect(all).toHaveLength(42);
  });

  it("each entry has a valid iata matching DESTINATIONS", () => {
    const all = getAllDestinationPriceHistories();
    const iatas = DESTINATIONS.map((d) => d.iata);
    all.forEach((h) => {
      expect(iatas).toContain(h.iata);
    });
  });
});

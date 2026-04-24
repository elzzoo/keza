// __tests__/app/destinations/sparkline.test.ts
import { buildSparklinePoints } from "@/app/destinations/[iata]/DestinationPageClient";
import type { DestinationPriceHistory } from "@/lib/priceHistory";

// Build a synthetic 12-month history for predictable assertions
function makeHistory(prices: number[], bestMonths: number[] = [], worstMonths: number[] = []): DestinationPriceHistory {
  const MONTHS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
  return {
    iata: "CDG",
    monthlyPrices: prices.map((price, i) => ({
      month: i,
      monthLabel: MONTHS[i],
      price,
      cpm: price * 100 / 35000,
      recommendation: "USE_MILES" as const,
    })),
    bestMonths,
    worstMonths,
  };
}

const FLAT_HISTORY = makeHistory(Array(12).fill(500), [0, 1], [10, 11]);
const VARIED_HISTORY = makeHistory([400, 450, 600, 700, 800, 900, 850, 780, 650, 500, 420, 380], [0, 11], [5]);

describe("buildSparklinePoints", () => {
  it("returns exactly 12 points for 12 months", () => {
    const { points } = buildSparklinePoints(FLAT_HISTORY);
    expect(points).toHaveLength(12);
  });

  it("x values span from 10 to ~390 (index 0 → index 11)", () => {
    const { points } = buildSparklinePoints(FLAT_HISTORY);
    expect(points[0].x).toBeCloseTo(10, 0);
    expect(points[11].x).toBeCloseTo(390, 0);
  });

  it("marks bestMonths correctly on points", () => {
    const { points } = buildSparklinePoints(FLAT_HISTORY);
    expect(points[0].isBest).toBe(true);
    expect(points[1].isBest).toBe(true);
    expect(points[5].isBest).toBe(false);
  });

  it("marks worstMonths correctly on points", () => {
    const { points } = buildSparklinePoints(FLAT_HISTORY);
    expect(points[10].isWorst).toBe(true);
    expect(points[11].isWorst).toBe(true);
    expect(points[0].isWorst).toBe(false);
  });

  it("returns minP and maxP matching source prices", () => {
    const { minP, maxP } = buildSparklinePoints(VARIED_HISTORY);
    expect(minP).toBe(380);
    expect(maxP).toBe(900);
  });

  it("polyline is a space-separated list of x,y pairs", () => {
    const { polyline } = buildSparklinePoints(FLAT_HISTORY);
    const pairs = polyline.split(" ");
    expect(pairs).toHaveLength(12);
    for (const pair of pairs) {
      expect(pair).toMatch(/^\d+(\.\d+)?,\d+(\.\d+)?$/);
    }
  });

  it("area path starts with M and ends with Z", () => {
    const { area } = buildSparklinePoints(FLAT_HISTORY);
    expect(area.startsWith("M ")).toBe(true);
    expect(area.endsWith("Z")).toBe(true);
  });

  it("handles flat prices without division-by-zero (range=0 → uses 1)", () => {
    // All prices identical — range should be treated as 1
    const { points, minP, maxP } = buildSparklinePoints(FLAT_HISTORY);
    expect(minP).toBe(maxP); // all same
    // y should all be the same (midpoint: 70 - 0 + 5 = 75)
    const yValues = new Set(points.map((p) => p.y));
    expect(yValues.size).toBe(1);
  });
});

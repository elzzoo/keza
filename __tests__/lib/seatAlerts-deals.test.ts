// __tests__/lib/seatAlerts-deals.test.ts

const mockGetPriceHistory = jest.fn();
const mockFetchCalendarPrices = jest.fn();

jest.mock("@/lib/priceHistoryRedis", () => ({
  getPriceHistory: (...args: unknown[]) => mockGetPriceHistory(...args),
}));

jest.mock("@/lib/engine/travelpayouts", () => ({
  fetchCalendarPrices: (...args: unknown[]) =>
    mockFetchCalendarPrices(...args),
}));

import type { CabinType } from "@/lib/seatAlerts";
import { detectDeal, getCurrentMonth } from "@/lib/seatAlerts";

describe("detectDeal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null if route format is invalid", async () => {
    const result = await detectDeal("INVALID", "BUSINESS", 5000);
    expect(result).toBeNull();
  });

  it("returns null if price history is insufficient", async () => {
    mockGetPriceHistory.mockResolvedValue([]);

    const result = await detectDeal("SIN-LAX", "BUSINESS", 5000);
    expect(result).toBeNull();
  });

  it("detects deal when price is below 80% of historical average", async () => {
    // Historical prices: 5000, 5100, 5200, 5300, 5400
    // Average: 5200
    // Business multiplier: 2.5
    // Adjusted average: 5200 * 2.5 = 13000
    // Threshold: 13000 * 0.8 = 10400
    // Current: 10000 < 10400 = DEAL
    mockGetPriceHistory.mockResolvedValue([
      { date: "2026-01-01", price: 5000 },
      { date: "2026-01-02", price: 5100 },
      { date: "2026-01-03", price: 5200 },
      { date: "2026-01-04", price: 5300 },
      { date: "2026-01-05", price: 5400 },
    ]);

    const result = await detectDeal("SIN-LAX", "BUSINESS", 10000);

    expect(result).not.toBeNull();
    expect(result?.route).toBe("SIN-LAX");
    expect(result?.cabin).toBe("BUSINESS");
    expect(result?.currentPrice).toBe(10000);
    expect(result?.discount).toBeGreaterThan(20);
  });

  it("returns null when price is not a deal", async () => {
    mockGetPriceHistory.mockResolvedValue([
      { date: "2026-01-01", price: 5000 },
      { date: "2026-01-02", price: 5100 },
      { date: "2026-01-03", price: 5200 },
      { date: "2026-01-04", price: 5300 },
      { date: "2026-01-05", price: 5400 },
    ]);

    // Average: 5200, Business multiplier: 2.5
    // Adjusted: 13000, Threshold: 10400
    // Current: 13000 > 10400 = NOT A DEAL
    const result = await detectDeal("SIN-LAX", "BUSINESS", 13000);

    expect(result).toBeNull();
  });

  it("applies cabin multiplier correctly", async () => {
    mockGetPriceHistory.mockResolvedValue([
      { date: "2026-01-01", price: 1000 },
      { date: "2026-01-02", price: 1000 },
      { date: "2026-01-03", price: 1000 },
      { date: "2026-01-04", price: 1000 },
      { date: "2026-01-05", price: 1000 },
    ]);

    // Economy multiplier: 1.0
    // Adjusted average: 1000 * 1.0 = 1000
    // Threshold: 1000 * 0.8 = 800
    const result = await detectDeal("CDG-LAX", "ECONOMY", 750);

    expect(result).not.toBeNull();
    expect(result?.historicalAvg).toBe(1000); // No multiplier applied, raw average
  });
});

describe("getCurrentMonth", () => {
  it("returns current month in YYYY-MM format", () => {
    const result = getCurrentMonth();
    expect(result).toMatch(/^\d{4}-\d{2}$/);

    // Should be ISO month format
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;
    expect(result).toBe(expected);
  });
});

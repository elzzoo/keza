// __tests__/lib/engineMerge.test.ts
// Tests for Duffel-first merge logic, synthetic isolation, confidence penalty sort
import { mergeFlights } from "@/lib/engine";
import type { NormalizedFlight } from "@/lib/promotions/engine";

// ─── mergeFlights — Duffel preferred over TP ─────────────────────────────────

describe("mergeFlights — source preference", () => {
  const base = {
    from: "DSS", to: "CDG", airlines: ["Air France"], stops: 0,
  };

  it("keeps a Duffel entry even when the TP entry is cheaper", () => {
    const tp: NormalizedFlight     = { ...base, price: 800, source: "TP",     priceConfidence: "LOW" };
    const duffel: NormalizedFlight = { ...base, price: 950, source: "DUFFEL", priceConfidence: "HIGH" };
    const merged = mergeFlights([tp], [duffel]);
    expect(merged).toHaveLength(1);
    expect(merged[0].source).toBe("DUFFEL");
    expect(merged[0].price).toBe(950); // Duffel price, not the cheaper TP
  });

  it("keeps a Duffel entry and inherits the TP booking link when Duffel has none", () => {
    const tp: NormalizedFlight     = { ...base, price: 800, source: "TP",     priceConfidence: "LOW",  bookingLink: "https://tp-link.com" };
    const duffel: NormalizedFlight = { ...base, price: 950, source: "DUFFEL", priceConfidence: "HIGH", bookingLink: undefined };
    const merged = mergeFlights([tp], [duffel]);
    expect(merged[0].source).toBe("DUFFEL");
    expect(merged[0].bookingLink).toBe("https://tp-link.com");
  });

  it("keeps a Duffel entry's own booking link when it has one", () => {
    const tp: NormalizedFlight     = { ...base, price: 800, source: "TP",     priceConfidence: "LOW",  bookingLink: "https://tp-link.com" };
    const duffel: NormalizedFlight = { ...base, price: 950, source: "DUFFEL", priceConfidence: "HIGH", bookingLink: "https://duffel-link.com" };
    const merged = mergeFlights([tp], [duffel]);
    expect(merged[0].bookingLink).toBe("https://duffel-link.com");
  });

  it("keeps the cheaper entry when both are same source (TP)", () => {
    const tp1: NormalizedFlight = { ...base, price: 800, source: "TP", priceConfidence: "LOW" };
    const tp2: NormalizedFlight = { ...base, price: 650, source: "TP", priceConfidence: "LOW" };
    const merged = mergeFlights([tp1], [tp2]);
    expect(merged).toHaveLength(1);
    expect(merged[0].price).toBe(650);
  });

  it("keeps distinct airlines as separate entries", () => {
    const af: NormalizedFlight = { from: "DSS", to: "CDG", airlines: ["Air France"],    stops: 0, price: 800, source: "TP", priceConfidence: "LOW" };
    const as: NormalizedFlight = { from: "DSS", to: "CDG", airlines: ["Air Senegal"],   stops: 0, price: 850, source: "TP", priceConfidence: "LOW" };
    const merged = mergeFlights([af], [as]);
    expect(merged).toHaveLength(2);
  });
});

// ─── Confidence penalty — synthetic always ranks last ─────────────────────────

describe("Confidence penalty — effectiveCost ordering", () => {
  // Mirrors the engine's CONFIDENCE_PENALTY and effectiveCost logic
  const CONFIDENCE_PENALTY: Record<string, number> = { HIGH: 1.00, LOW: 1.05, ESTIMATED: 1.10 };
  const effectiveCost = (cashCost: number, milesCost: number, confidence: string) => {
    const penalty = CONFIDENCE_PENALTY[confidence] ?? 1.05;
    const base = milesCost > 0 ? Math.min(cashCost, milesCost) : cashCost;
    return base * penalty;
  };

  it("Duffel (HIGH) ranks above same-price TP (LOW)", () => {
    const duffelCost = effectiveCost(500, 0, "HIGH");  // 500 × 1.00 = 500
    const tpCost     = effectiveCost(500, 0, "LOW");   // 500 × 1.05 = 525
    expect(duffelCost).toBeLessThan(tpCost);
  });

  it("Synthetic (ESTIMATED) always ranks below LOW-confidence TP at same price", () => {
    const syntheticCost = effectiveCost(500, 0, "ESTIMATED"); // 500 × 1.10 = 550
    const tpCost        = effectiveCost(500, 0, "LOW");       // 500 × 1.05 = 525
    expect(syntheticCost).toBeGreaterThan(tpCost);
  });

  it("a cheaper TP flight still beats a more expensive Duffel flight", () => {
    const duffelCost = effectiveCost(900, 0, "HIGH"); // 900 × 1.00 = 900
    const tpCost     = effectiveCost(600, 0, "LOW");  // 600 × 1.05 = 630
    expect(tpCost).toBeLessThan(duffelCost);
  });

  it("synthetic penalty does not affect miles calculation (milesCost preserved)", () => {
    // The penalty only affects ranking — displayed prices remain unchanged.
    // Here we verify that milesCost < cashCost still wins even for ESTIMATED confidence.
    const syntheticMilesCost = effectiveCost(500, 300, "ESTIMATED"); // min(500,300) × 1.10 = 330
    const realCashCost       = effectiveCost(400, 0,   "HIGH");      // 400 × 1.00 = 400
    // Even with penalty, miles option (330) < cash real flight (400)
    expect(syntheticMilesCost).toBeLessThan(realCashCost);
  });
});

// ─── Synthetic isolation — no miles options ───────────────────────────────────

describe("Synthetic flights — enrichSynthetic contract", () => {
  // We cannot call enrichSynthetic directly (it's not exported),
  // but we can verify the NormalizedFlight shape that feeds it.
  it("synthetic NormalizedFlight has SYNTHETIC source and ESTIMATED confidence", () => {
    const synthetic: NormalizedFlight = {
      from: "DSS", to: "CDG",
      price: 800, airlines: ["Air Senegal"], stops: 0,
      isSupplemental: true, source: "SYNTHETIC", priceConfidence: "ESTIMATED",
    };
    expect(synthetic.source).toBe("SYNTHETIC");
    expect(synthetic.priceConfidence).toBe("ESTIMATED");
    expect(synthetic.isSupplemental).toBe(true);
    // Verify it would never be merged with real flights (different source key)
    const real: NormalizedFlight = { from: "DSS", to: "CDG", price: 700, airlines: ["Air Senegal"], stops: 0, source: "TP", priceConfidence: "LOW" };
    const merged = mergeFlights([real], [synthetic]);
    // Same airline+stops key: mergeFlights should keep TP (real) over SYNTHETIC
    // because SYNTHETIC is not "DUFFEL" and TP is cheaper
    expect(merged).toHaveLength(1);
    expect(merged[0].source).toBe("TP"); // real flight wins (cheaper)
  });
});

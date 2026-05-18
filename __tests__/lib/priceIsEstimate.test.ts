// __tests__/lib/priceIsEstimate.test.ts
// Verifies the recommendation-downgrade contract for estimated cabin prices.
// When CABIN_MULTIPLIER is used to fabricate a business/first cash price (no
// Duffel real cabin data), the miles-vs-cash comparison is unreliable and the
// recommendation must be downgraded to "IF_HAVE_MILES" so the UI cannot show a
// confident "USE_MILES saves you XXX€" claim built on a guessed cash price.

import type { NormalizedFlight } from "@/lib/promotions/engine";
import type { Recommendation } from "@/lib/costEngine";

// Mirror of the logic inside engine.ts::enrich() — kept in sync with that file.
function computePriceIsEstimate(f: NormalizedFlight, cabin: string): boolean {
  return !f.cabinResolved && cabin !== "economy";
}

function downgradeRecommendation(
  raw: Recommendation,
  priceIsEstimate: boolean
): Recommendation {
  return priceIsEstimate ? "IF_HAVE_MILES" : raw;
}

describe("priceIsEstimate → recommendation downgrade", () => {
  it("business + TP (no cabinResolved) → priceIsEstimate=true", () => {
    const tp: NormalizedFlight = {
      from: "CDG", to: "JFK", price: 500, airlines: ["Air France"],
      source: "TP", priceConfidence: "LOW",
    };
    expect(computePriceIsEstimate(tp, "business")).toBe(true);
  });

  it("business + Duffel (cabinResolved) → priceIsEstimate=false", () => {
    const duffel: NormalizedFlight = {
      from: "CDG", to: "JFK", price: 2000, airlines: ["Air France"],
      source: "DUFFEL", priceConfidence: "HIGH", cabinResolved: true,
    };
    expect(computePriceIsEstimate(duffel, "business")).toBe(false);
  });

  it("economy + TP → priceIsEstimate=false (no downgrade in economy)", () => {
    const tp: NormalizedFlight = {
      from: "CDG", to: "JFK", price: 500, airlines: ["Air France"],
      source: "TP", priceConfidence: "LOW",
    };
    expect(computePriceIsEstimate(tp, "economy")).toBe(false);
  });

  it("USE_MILES recommendation is downgraded to IF_HAVE_MILES when estimated", () => {
    expect(downgradeRecommendation("USE_MILES", true)).toBe("IF_HAVE_MILES");
  });

  it("USE_CASH recommendation is downgraded to IF_HAVE_MILES when estimated", () => {
    expect(downgradeRecommendation("USE_CASH", true)).toBe("IF_HAVE_MILES");
  });

  it("recommendation is preserved when price is NOT an estimate", () => {
    expect(downgradeRecommendation("USE_MILES", false)).toBe("USE_MILES");
    expect(downgradeRecommendation("USE_CASH",  false)).toBe("USE_CASH");
  });

  it("economy flow is untouched: USE_MILES stays USE_MILES", () => {
    const tp: NormalizedFlight = {
      from: "CDG", to: "JFK", price: 500, airlines: ["Air France"],
      source: "TP", priceConfidence: "LOW",
    };
    const estimated = computePriceIsEstimate(tp, "economy");
    expect(downgradeRecommendation("USE_MILES", estimated)).toBe("USE_MILES");
  });
});

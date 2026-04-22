import { DESTINATIONS } from "@/data/destinations";
import { computeDealRatio, classifyDeal } from "@/lib/dealsEngine";
import { getMonthlyPrices } from "@/lib/priceHistory";

describe("destinations static generation logic", () => {
  it("DESTINATIONS contient exactement 20 destinations", () => {
    expect(DESTINATIONS).toHaveLength(20);
  });

  it("chaque destination produit un iata lowercase de 3 caractères", () => {
    const params = DESTINATIONS.map((d) => ({ iata: d.iata.toLowerCase() }));
    for (const p of params) {
      expect(p.iata).toMatch(/^[a-z]{3}$/);
    }
  });

  it("chaque destination a une recommendation valide", () => {
    const valid = ["USE_MILES", "NEUTRAL", "USE_CASH"];
    for (const dest of DESTINATIONS) {
      const cpm = computeDealRatio(dest.cashEstimateUsd, dest.milesEstimate);
      const rec = classifyDeal(cpm);
      expect(valid).toContain(rec);
    }
  });

  it("chaque destination produit exactement 12 prix mensuels", () => {
    for (const dest of DESTINATIONS) {
      const history = getMonthlyPrices(dest);
      expect(history.monthlyPrices).toHaveLength(12);
    }
  });

  it("bestMonths et worstMonths ne sont jamais vides", () => {
    for (const dest of DESTINATIONS) {
      const history = getMonthlyPrices(dest);
      expect(history.bestMonths.length).toBeGreaterThan(0);
      expect(history.worstMonths.length).toBeGreaterThan(0);
    }
  });
});

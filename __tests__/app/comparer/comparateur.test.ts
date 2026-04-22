import { buildComparisonData } from "@/app/comparer/ComparateurClient";

describe("buildComparisonData", () => {
  it("retourne un tableau vide pour une liste vide", () => {
    expect(buildComparisonData([])).toHaveLength(0);
  });

  it("filtre les IATA invalides", () => {
    const result = buildComparisonData(["INVALID"]);
    expect(result).toHaveLength(0);
  });

  it("retourne 1 item pour un IATA valide", () => {
    const result = buildComparisonData(["CDG"]);
    expect(result).toHaveLength(1);
    expect(result[0].dest.city).toBe("Paris");
  });

  it("retourne 3 items pour 3 IATA valides", () => {
    const result = buildComparisonData(["CDG", "NRT", "DXB"]);
    expect(result).toHaveLength(3);
  });

  it("calcule le CPM correctement pour CDG", () => {
    const result = buildComparisonData(["CDG"]);
    // CPM = cashEstimateUsd * 100 / milesEstimate = 680 * 100 / 35000 ≈ 1.94
    expect(result[0].cpm).toBeCloseTo((680 * 100) / 35000, 1);
  });

  it("la recommandation USE_MILES implique CPM >= 1.5", () => {
    const result = buildComparisonData(["CDG", "NRT", "DXB"]);
    for (const item of result) {
      if (item.recommendation === "USE_MILES") expect(item.cpm).toBeGreaterThanOrEqual(1.5);
      if (item.recommendation === "USE_CASH") expect(item.cpm).toBeLessThan(1.0);
    }
  });

  it("bestLabels est un tableau non vide de strings", () => {
    const result = buildComparisonData(["CDG"]);
    expect(result[0].bestLabels.length).toBeGreaterThan(0);
    expect(typeof result[0].bestLabels[0]).toBe("string");
  });

  it("accepte les IATA en minuscules", () => {
    const result = buildComparisonData(["cdg"]);
    expect(result).toHaveLength(1);
    expect(result[0].dest.iata).toBe("CDG");
  });
});

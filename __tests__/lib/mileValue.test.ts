import { getAchievedCpp, rateCpp, CPP_RATING_DISPLAY } from "@/lib/mileValue";

describe("getAchievedCpp", () => {
  it("computes CPP for a business class redemption", () => {
    // $4,000 cash / 90,000 miles = 4.44 ¢/mile
    expect(getAchievedCpp(4_000, 90_000)).toBeCloseTo(4.44, 1);
  });

  it("computes CPP for an economy redemption", () => {
    // $700 cash / 35,000 miles = 2.00 ¢/mile
    expect(getAchievedCpp(700, 35_000)).toBeCloseTo(2.0, 1);
  });

  it("returns 0 when miles are 0 (avoid division by zero)", () => {
    expect(getAchievedCpp(500, 0)).toBe(0);
  });

  it("returns 0 when cash cost is 0", () => {
    expect(getAchievedCpp(0, 50_000)).toBe(0);
  });

  it("returns a value rounded to 2 decimal places", () => {
    const cpp = getAchievedCpp(1_200, 70_000);
    expect(String(cpp).split(".")[1]?.length ?? 0).toBeLessThanOrEqual(2);
  });
});

describe("rateCpp", () => {
  const MARKET = 1.6; // KrisFlyer market rate

  it("rates 2× market as excellent", () => {
    expect(rateCpp(3.2, MARKET)).toBe("excellent"); // 2.0× ratio
  });

  it("rates 4.44¢ vs 1.6¢ market as excellent", () => {
    // ratio = 2.775 — SIN-LAX business is a sweet spot
    expect(rateCpp(4.44, MARKET)).toBe("excellent");
  });

  it("rates 1.5× market as good", () => {
    expect(rateCpp(2.4, MARKET)).toBe("good"); // 1.5× ratio
  });

  it("rates near-market (0.95×) as fair", () => {
    expect(rateCpp(1.52, MARKET)).toBe("fair");
  });

  it("rates below market (0.6×) as poor", () => {
    expect(rateCpp(0.96, MARKET)).toBe("poor");
  });

  it("returns fair when market rate is 0 (guard)", () => {
    expect(rateCpp(2.0, 0)).toBe("fair");
  });
});

describe("CPP_RATING_DISPLAY", () => {
  it("has labels and colors for all four ratings", () => {
    const ratings: string[] = ["excellent", "good", "fair", "poor"];
    for (const r of ratings) {
      const d = CPP_RATING_DISPLAY[r as keyof typeof CPP_RATING_DISPLAY];
      expect(d.fr).toBeTruthy();
      expect(d.en).toBeTruthy();
      expect(d.color).toMatch(/^text-/);
    }
  });
});

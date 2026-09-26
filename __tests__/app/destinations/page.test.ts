import { DESTINATIONS } from "@/data/destinations";
import { computeDealRatio, classifyDeal } from "@/lib/dealsEngine";
import { getMonthlyPrices } from "@/lib/priceHistory";
import { generateMetadata as generateFrMetadata } from "@/app/destinations/[iata]/page";
import { generateMetadata as generateEnMetadata } from "@/app/en/destinations/[iata]/page";
import sitemap from "@/app/sitemap";
import { SITE_URL } from "@/lib/siteConfig";

describe("destinations static generation logic", () => {
  it("tous les IATA de DESTINATIONS sont uniques", () => {
    const iatas = DESTINATIONS.map((d) => d.iata);
    const unique = new Set(iatas);
    expect(unique.size).toBe(iatas.length);
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

  it("un iata inconnu ne produit aucune destination", () => {
    const dest = DESTINATIONS.find((d) => d.iata.toLowerCase() === "xxx");
    expect(dest).toBeUndefined();
  });

  it("exposes bilingual metadata for destination pages", async () => {
    const fr = await generateFrMetadata({ params: Promise.resolve({ iata: "cdg" }) });
    const en = await generateEnMetadata({ params: Promise.resolve({ iata: "cdg" }) });

    expect(fr.title).toContain("Vols Dakar");
    expect(fr.alternates).toMatchObject({
      canonical: `${SITE_URL}/destinations/cdg`,
      languages: {
        fr: `${SITE_URL}/destinations/cdg`,
        en: `${SITE_URL}/en/destinations/cdg`,
      },
    });
    expect(en.title).toContain("Flights from Dakar");
    expect(en.alternates).toMatchObject({
      canonical: `${SITE_URL}/en/destinations/cdg`,
      languages: {
        fr: `${SITE_URL}/destinations/cdg`,
        en: `${SITE_URL}/en/destinations/cdg`,
      },
    });
  });

  it("uses English city names in EN destination metadata", async () => {
    const en = await generateEnMetadata({ params: Promise.resolve({ iata: "cai" }) });

    expect(en.title).toContain("Cairo");
    expect(en.title).not.toContain("Le Caire");
    expect(en.description).toContain("Cairo");
    expect(en.description).not.toContain("Le Caire");
  });

  it("includes FR and EN destination pages in the sitemap", () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toEqual(expect.arrayContaining([
      `${SITE_URL}/destinations/cdg`,
      `${SITE_URL}/en/destinations/cdg`,
    ]));
  });
});

import { readFileSync } from "fs";
import path from "path";

describe("deals page polish", () => {
  it("keeps public deal filters and recommendation badges free of visible emoji symbols", () => {
    const source = readFileSync(path.join(process.cwd(), "app/deals/DealsPageClient.tsx"), "utf8");
    expect(source).not.toMatch(/[💰🔍🕌🌍🌎🌏✈]/u);
  });

  it("does not promise live bookable prices for cached or fallback deals", () => {
    const files = [
      "app/deals/page.tsx",
      "app/en/deals/page.tsx",
      "components/DealsStrip.tsx",
      "app/deals/DealsPageClient.tsx",
      "app/deals/opengraph-image.tsx",
    ].map((file) => readFileSync(path.join(process.cwd(), file), "utf8"));

    for (const source of files) {
      expect(source).not.toMatch(/Live deals|mis à jour en continu|updated continuously|en temps réel|in real time/);
    }
    expect(files[0]).toContain("Prix cash indicatifs et miles estimés");
    expect(files[1]).toContain("Indicative cash fares and estimated miles");
    expect(files[3]).toContain("Cash indicatif");
    expect(files[3]).toContain("Miles estimés");
    expect(files[4]).toContain("Vérifiez les tarifs pour vos dates");
  });
});

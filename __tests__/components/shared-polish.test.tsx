import fs from "fs";
import path from "path";

describe("shared component polish", () => {
  it("keeps reusable route/value helpers free of visible emoji affordances", () => {
    const files = [
      "components/CheapestRouteBanner.tsx",
      "components/TrendingRoutesWidget.tsx",
      "components/FlightRouteError.tsx",
      "components/AwardAvailabilityDisclaimer.tsx",
      "components/TPCacheDisclaimer.tsx",
    ];

    for (const file of files) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).not.toMatch(/[🏷️🔥⚠️ℹ️]/u);
    }
  });
});

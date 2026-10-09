import { readFileSync } from "fs";
import path from "path";

describe("deals page polish", () => {
  it("keeps public deal filters and recommendation badges free of visible emoji symbols", () => {
    const source = readFileSync(path.join(process.cwd(), "app/deals/DealsPageClient.tsx"), "utf8");
    expect(source).not.toMatch(/[💰🔍🕌🌍🌎🌏✈]/u);
  });
});

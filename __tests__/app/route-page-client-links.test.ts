import fs from "fs";
import path from "path";

describe("RoutePageClient localized links", () => {
  it("localizes the Pro upsell link instead of hardcoding the French route", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/flights/[route]/RoutePageClient.tsx"),
      "utf8"
    );

    expect(source).toContain('const proHref = fr ? "/pro" : "/en/pro"');
    expect(source).toContain("href={proHref}");
    expect(source).not.toContain('href="/pro"');
  });
});

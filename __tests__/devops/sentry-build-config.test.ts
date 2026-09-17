import { readFileSync } from "fs";
import { join } from "path";

describe("Sentry build configuration", () => {
  it("gates source-map upload to CI/Vercel builds", () => {
    const config = readFileSync(join(process.cwd(), "next.config.mjs"), "utf8");

    expect(config).toContain('process.env.VERCEL === "1" || process.env.CI === "true"');
    expect(config).toContain("create: sentryUploadEnabled");
    expect(config).toContain("disable: !sentryUploadEnabled");
    expect(config).toContain("disableServerWebpackPlugin: !sentryServerUploadEnabled");
    expect(config).toContain("disableClientWebpackPlugin: !sentryClientUploadEnabled");
  });
});

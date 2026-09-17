import { readFileSync } from "fs";
import { join } from "path";

describe("Sentry build configuration", () => {
  it("gates source-map upload to Vercel builds", () => {
    const config = readFileSync(join(process.cwd(), "next.config.mjs"), "utf8");

    expect(config).toContain('process.env.VERCEL === "1"');
    expect(config).toContain("sentryUploadEnabled");
    expect(config).toContain("? withSentryConfig(nextConfig");
    expect(config).toContain(": nextConfig");
    expect(config).toContain("create: true");
    expect(config).toContain("disable: false");
    expect(config).toContain("disableServerWebpackPlugin: !sentryServerUploadEnabled");
    expect(config).toContain("disableClientWebpackPlugin: !sentryClientUploadEnabled");
  });
});

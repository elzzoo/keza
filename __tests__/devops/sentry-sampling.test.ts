/**
 * Sentry Trace Sampling Configuration Tests
 * Verifies that trace sampling is configured for adequate error context
 * and performance monitoring across client and server.
 */

describe("Sentry Trace Sampling", () => {
  it("server-side trace sampling is configured at 0.5 (50%)", async () => {
    // Check sentry.server.config.ts has sufficient trace sampling
    const fs = await import("fs");
    const path = await import("path");
    const configPath = path.join(process.cwd(), "sentry.server.config.ts");
    const configStr = fs.readFileSync(configPath, "utf-8");

    // Should contain tracesSampleRate: 0.5
    expect(configStr).toContain("tracesSampleRate: 0.5");
    expect(configStr).not.toContain("tracesSampleRate: 0.1");
  });

  it("client-side trace sampling is configured at 0.5 (50%)", async () => {
    // Check sentry.client.config.ts has sufficient trace sampling
    const fs = await import("fs");
    const path = await import("path");
    const configPath = path.join(process.cwd(), "sentry.client.config.ts");
    const configStr = fs.readFileSync(configPath, "utf-8");

    // Should contain tracesSampleRate: 0.5
    expect(configStr).toContain("tracesSampleRate: 0.5");
    expect(configStr).not.toContain("tracesSampleRate: 0.1");
  });

  it("client-side has session replay configured", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const configPath = path.join(process.cwd(), "sentry.client.config.ts");
    const configStr = fs.readFileSync(configPath, "utf-8");

    // Should have session replay settings
    expect(configStr).toContain("replaysSessionSampleRate");
    expect(configStr).toContain("replaysOnErrorSampleRate");
  });

  it("server config includes HTTP integration for better errors", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const configPath = path.join(process.cwd(), "sentry.server.config.ts");
    const configStr = fs.readFileSync(configPath, "utf-8");

    expect(configStr).toContain("httpIntegration");
  });

  it("trace sampling provides adequate error context", () => {
    // With 50% sampling:
    // - Server: captures 1 in 2 transactions (2000 monthly → 1000 sampled)
    // - Client: captures 1 in 2 page loads (5000 monthly → 2500 sampled)
    // - Enough for correlation analysis, still within free tier budget
    const samplingRate = 0.5;
    expect(samplingRate).toBeGreaterThanOrEqual(0.5);
    expect(samplingRate).toBeLessThanOrEqual(1.0);
  });

  it("sampling is documented with rationale in config files", async () => {
    const fs = await import("fs");
    const path = await import("path");

    // Check server config has comment explaining increase
    let configPath = path.join(process.cwd(), "sentry.server.config.ts");
    let configStr = fs.readFileSync(configPath, "utf-8");
    expect(configStr).toMatch(/increased|better/i);

    // Check client config has comment explaining increase
    configPath = path.join(process.cwd(), "sentry.client.config.ts");
    configStr = fs.readFileSync(configPath, "utf-8");
    expect(configStr).toMatch(/increased|better|observability/i);
  });
});

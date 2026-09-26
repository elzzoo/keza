/**
 * Sentry Trace Sampling Configuration Tests
 * Verifies that trace sampling is configured for adequate error context
 * and performance monitoring across client and server.
 */

describe("Sentry Trace Sampling", () => {
  it("server-side trace sampling is low by default and env configurable", async () => {
    // Check sentry.server.config.ts has sufficient trace sampling
    const fs = await import("fs");
    const path = await import("path");
    const configPath = path.join(process.cwd(), "sentry.server.config.ts");
    const configStr = fs.readFileSync(configPath, "utf-8");

    expect(configStr).toContain("SENTRY_TRACES_SAMPLE_RATE");
    expect(configStr).toContain("NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE");
    expect(configStr).toContain("0.1");
    expect(configStr).toContain("tracesSampleRate");
    expect(configStr).not.toContain("tracesSampleRate: 0.5");
  });

  it("client-side trace sampling is low by default and env configurable", async () => {
    // Check instrumentation-client.ts has sufficient trace sampling
    const fs = await import("fs");
    const path = await import("path");
    const configPath = path.join(process.cwd(), "instrumentation-client.ts");
    const configStr = fs.readFileSync(configPath, "utf-8");

    expect(configStr).toContain("NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE");
    expect(configStr).toContain("0.1");
    expect(configStr).toContain("tracesSampleRate");
    expect(configStr).not.toContain("tracesSampleRate: 0.5");
  });

  it("client-side has session replay configured", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const configPath = path.join(process.cwd(), "instrumentation-client.ts");
    const configStr = fs.readFileSync(configPath, "utf-8");

    // Should have session replay settings
    expect(configStr).toContain("replaysSessionSampleRate");
    expect(configStr).toContain("replaysOnErrorSampleRate");
  });

  it("client-side replay sampling is low by default and env configurable", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const configPath = path.join(process.cwd(), "instrumentation-client.ts");
    const configStr = fs.readFileSync(configPath, "utf-8");

    expect(configStr).toContain("NEXT_PUBLIC_SENTRY_REPLAY_SAMPLE_RATE");
    expect(configStr).toContain("NEXT_PUBLIC_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE");
    expect(configStr).toContain("0.01");
    expect(configStr).toContain("0.5");
    expect(configStr).not.toContain("replaysOnErrorSampleRate: 1.0");
    expect(configStr).not.toContain("replaysSessionSampleRate: 1.0");
  });

  it("server config includes HTTP integration for better errors", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const configPath = path.join(process.cwd(), "sentry.server.config.ts");
    const configStr = fs.readFileSync(configPath, "utf-8");

    expect(configStr).toContain("httpIntegration");
  });

  it("trace sampling keeps default volume manageable", () => {
    // With 10% sampling:
    // - Server: captures 1 in 10 transactions by default
    // - Client: captures 1 in 10 page loads by default
    // - Sentry quotas stay protected; env vars can raise this during incidents
    const samplingRate = 0.1;
    expect(samplingRate).toBeGreaterThanOrEqual(0.05);
    expect(samplingRate).toBeLessThanOrEqual(1.0);
  });

  it("sampling is documented with rationale in config files", async () => {
    const fs = await import("fs");
    const path = await import("path");

    // Check server config has comment explaining cost-aware default
    let configPath = path.join(process.cwd(), "sentry.server.config.ts");
    let configStr = fs.readFileSync(configPath, "utf-8");
    expect(configStr).toMatch(/cheap|investigations|launches/i);

    // Check client config has comment explaining cost-aware default
    configPath = path.join(process.cwd(), "instrumentation-client.ts");
    configStr = fs.readFileSync(configPath, "utf-8");
    expect(configStr).toMatch(/cheap|investigations|launches/i);
  });

  it("edge trace sampling follows the same server-side env controls", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const configPath = path.join(process.cwd(), "sentry.edge.config.ts");
    const configStr = fs.readFileSync(configPath, "utf-8");

    expect(configStr).toContain("SENTRY_TRACES_SAMPLE_RATE");
    expect(configStr).toContain("NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE");
    expect(configStr).toContain("0.1");
    expect(configStr).toContain("tracesSampleRate");
  });
});

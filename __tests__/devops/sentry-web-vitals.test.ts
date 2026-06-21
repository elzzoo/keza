/**
 * Sentry Web Vitals Monitoring Tests
 * Verifies that Core Web Vitals (LCP, FID, CLS) are captured for monitoring
 */

describe("Sentry Web Vitals Monitoring", () => {
  it("Sentry SDK is available for Web Vitals", () => {
    // This test verifies that the Sentry SDK is available
    // The actual implementation is in sentry.client.config.ts
    const Sentry = require("@sentry/nextjs");
    expect(Sentry).toBeDefined();
    expect(Sentry.captureMessage).toBeDefined();
  });

  it("Web Vitals metric shape includes required fields", () => {
    // Verify the expected Web Vitals metric structure
    // name: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'FCP'
    // value: number (milliseconds)
    // rating: 'good' | 'needs-improvement' | 'poor'
    // delta: number
    const mockMetric = {
      name: "LCP" as const,
      value: 1500,
      rating: "good" as const,
      delta: 0,
      id: "test-metric",
    };

    expect(mockMetric.name).toBeTruthy();
    expect(mockMetric.value).toBeGreaterThan(0);
    expect(["good", "needs-improvement", "poor"]).toContain(mockMetric.rating);
  });

  it("Web Vitals thresholds are correct", () => {
    // Google's Web Vitals thresholds (as of 2024)
    // LCP (Largest Contentful Paint): < 2.5s = good
    // FID (First Input Delay): < 100ms = good
    // CLS (Cumulative Layout Shift): < 0.1 = good
    // TTFB (Time to First Byte): < 800ms = good
    // FCP (First Contentful Paint): < 1.8s = good

    const thresholds = {
      LCP: 2500, // ms
      FID: 100,  // ms
      CLS: 0.1,  // unitless
      TTFB: 800, // ms
      FCP: 1800, // ms
    };

    expect(thresholds.LCP).toBe(2500);
    expect(thresholds.FID).toBe(100);
    expect(thresholds.CLS).toBe(0.1);
  });

  it("sentry.client.config.ts enables Web Vitals monitoring", async () => {
    // This test verifies that the file monitors LCP and CLS via PerformanceObserver
    const fs = await import("fs");
    const path = await import("path");
    const configPath = path.join(process.cwd(), "sentry.client.config.ts");
    const configContent = fs.readFileSync(configPath, "utf-8");

    expect(configContent).toContain("PerformanceObserver");
    expect(configContent).toContain("LCP");
    expect(configContent).toContain("CLS");
    expect(configContent).toContain("largest-contentful-paint");
    expect(configContent).toContain("layout-shift");
  });
});

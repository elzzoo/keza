describe("P1-5: Payment Error Tracking - Sentry Integration", () => {
  test("checkout route imports and uses Sentry for exceptions", async () => {
    const fs = require("fs");
    const checkoutRoute = fs.readFileSync(
      require.resolve("@/app/api/pro/checkout/route"),
      "utf8"
    );

    // Verify Sentry import
    expect(checkoutRoute).toContain('import * as Sentry from "@sentry/nextjs"');

    // Verify Sentry.captureException is called
    expect(checkoutRoute).toContain("Sentry.captureException");

    // Verify withMonitor wraps the endpoint
    expect(checkoutRoute).toContain("Sentry.withMonitor");
  });

  test("lemonsqueezy webhook route uses Sentry for payload errors", async () => {
    const fs = require("fs");
    const webhookRoute = fs.readFileSync(
      require.resolve("@/app/api/webhooks/lemonsqueezy/route"),
      "utf8"
    );

    // Verify Sentry import
    expect(webhookRoute).toContain('import * as Sentry from "@sentry/nextjs"');

    // Verify Sentry.captureException is called for payload parse errors
    expect(webhookRoute).toContain("Sentry.captureException");

    // Verify withMonitor wraps the webhook
    expect(webhookRoute).toContain("Sentry.withMonitor");

    // Verify exception context with tags
    expect(webhookRoute).toContain("tags: { route: ");
  });

  test("payment error handling includes transaction monitoring", async () => {
    const fs = require("fs");
    const checkoutRoute = fs.readFileSync(
      require.resolve("@/app/api/pro/checkout/route"),
      "utf8"
    );

    // Verify function is wrapped in Sentry.withMonitor for APM
    expect(checkoutRoute).toContain("withMonitor(");
    expect(checkoutRoute).toMatch(/withMonitor\(\s*["']checkout/);
  });
});

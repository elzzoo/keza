// This file configures the initialization of Sentry on the **client** side.
// The config you add here will be used whenever the browser handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 50% of transactions for performance monitoring — increased for better observability
  // Higher sampling helps catch frontend slowdowns (search, calendar, portfolio page loads)
  // and improves correlation with server-side errors
  tracesSampleRate: 0.5,

  // Capture 5% of sessions for session replay
  replaysSessionSampleRate: 0.05,

  // Capture 100% of sessions with an error for replay debugging
  replaysOnErrorSampleRate: 1.0,

  environment: process.env.NODE_ENV,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Use the Sentry debug transport to see what's being sent
  debug: false,

  // Enable Web Vitals auto-capture (LCP, FID, CLS)
  // These will be attached to transactions automatically
  integrations: [
    Sentry.captureConsoleIntegration({ levels: ["error", "warn"] }),
    Sentry.httpClientIntegration(),
    Sentry.replayIntegration(),
    Sentry.breadcrumbsIntegration({ console: true, dom: true, fetch: true, xhr: true }),
  ],
});

// Auto-capture Web Vitals (LCP, FID, CLS, etc.)
// This enables monitoring of Core Web Vitals in Sentry
Sentry.captureWebVitals((metric) => {
  // Log each Web Vital for monitoring
  // Expected: LCP < 2.5s, FID < 100ms, CLS < 0.1
  const isGood = metric.rating === "good";
  const isNeedsImprovement = metric.rating === "needs-improvement";

  if (isNeedsImprovement || !isGood) {
    // Capture poor-performing vitals as transactions for visibility
    Sentry.captureMessage(
      `Web Vital: ${metric.name} = ${metric.value?.toFixed(2)}ms (${metric.rating})`,
      metric.rating === "poor" ? "error" : "warning"
    );
  }
});

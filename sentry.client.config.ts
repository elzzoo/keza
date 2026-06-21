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
    Sentry.browserProfilingIntegration(),
  ],
});

// Auto-capture Web Vitals (LCP, FID, CLS, etc.) via native Web Vitals API
// Listen to performance observer entries for Core Web Vitals
if (typeof window !== "undefined") {
  // Monitor LCP (Largest Contentful Paint)
  const lcpObserver = new PerformanceObserver((list) => {
    const lastEntry = list.getEntries().pop();
    if (lastEntry) {
      const lcpValue = lastEntry.startTime;
      const rating = lcpValue < 2500 ? "good" : lcpValue < 4000 ? "needs-improvement" : "poor";
      if (rating !== "good") {
        Sentry.captureMessage(
          `Web Vital LCP: ${lcpValue.toFixed(2)}ms (${rating})`,
          rating === "poor" ? "error" : "warning"
        );
      }
    }
  });
  lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });

  // Monitor CLS (Cumulative Layout Shift)
  let clsValue = 0;
  const clsObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as PerformanceEntry & { hadRecentInput?: boolean }).hadRecentInput) {
        clsValue += (entry as PerformanceEntry & { value?: number }).value || 0;
      }
    }
    const rating = clsValue < 0.1 ? "good" : clsValue < 0.25 ? "needs-improvement" : "poor";
    if (rating !== "good") {
      Sentry.captureMessage(
        `Web Vital CLS: ${clsValue.toFixed(3)} (${rating})`,
        rating === "poor" ? "error" : "warning"
      );
    }
  });
  clsObserver.observe({ entryTypes: ["layout-shift"] });
}

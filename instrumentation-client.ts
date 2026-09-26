// This file configures the initialization of Sentry on the **client** side.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

function parseSampleRate(value: string | undefined, fallback: number) {
  if (value === undefined) return fallback;
  const rate = Number(value);
  if (!Number.isFinite(rate)) return fallback;
  return Math.min(1, Math.max(0, rate));
}

const replaySessionSampleRate = parseSampleRate(
  process.env.NEXT_PUBLIC_SENTRY_REPLAY_SAMPLE_RATE,
  0.01
);
const replayOnErrorSampleRate = parseSampleRate(
  process.env.NEXT_PUBLIC_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE,
  0.5
);
const tracesSampleRate = parseSampleRate(
  process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
  0.1
);

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Keep trace volume cheap by default. Raise NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE
  // temporarily during performance investigations or launches.
  tracesSampleRate,

  // Keep Replay cheap by default. Override with NEXT_PUBLIC_SENTRY_REPLAY_SAMPLE_RATE
  // only during short UX/debugging windows.
  replaysSessionSampleRate: replaySessionSampleRate,

  // Error replays are valuable, but 100% makes the ~120KB Replay chunk too common.
  // Override with NEXT_PUBLIC_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE when investigating.
  replaysOnErrorSampleRate: replayOnErrorSampleRate,

  environment: process.env.NODE_ENV,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Use the Sentry debug transport to see what's being sent
  debug: false,

  integrations: [
    Sentry.captureConsoleIntegration({ levels: ["error", "warn"] }),
    Sentry.httpClientIntegration(),
    Sentry.breadcrumbsIntegration({ console: true, dom: true, fetch: true, xhr: true }),
    Sentry.browserProfilingIntegration(),
  ],
});

// Instrument router transitions for client-side navigation tracking
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

// Session Replay adds ~120KB to the client bundle on its own. Calling
// replayIntegration() inside the `integrations` array above (like the other
// integrations) makes that cost part of every page's initial download, even
// though replaysSessionSampleRate (5%) means most visits never record a
// replay. Adding it after the page has settled instead lets it load in its
// own chunk, off the critical path — replaysSessionSampleRate/
// replaysOnErrorSampleRate above still apply once it's registered.
if (typeof window !== "undefined" && (replaySessionSampleRate > 0 || replayOnErrorSampleRate > 0)) {
  const loadReplay = () => {
    Sentry.addIntegration(Sentry.replayIntegration());
  };
  if ("requestIdleCallback" in window) {
    requestIdleCallback(loadReplay, { timeout: 4000 });
  } else {
    setTimeout(loadReplay, 4000);
  }
}

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

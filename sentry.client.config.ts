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
});

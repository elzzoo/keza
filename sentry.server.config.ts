// This file configures the initialization of Sentry on the **server** side.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring — increased from 0.1 to 0.5 for better error context
  // Higher sampling captures more transaction details (slow endpoints, errors)
  // Cost: ~5× more trace events sent to Sentry (still within free tier)
  tracesSampleRate: 0.5, // 50% of transactions

  // Track slow transactions
  maxBreadcrumbs: 50,
  integrations: [
    Sentry.httpIntegration(),
  ],

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});

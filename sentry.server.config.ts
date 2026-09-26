// This file configures the initialization of Sentry on the **server** side.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

function parseSampleRate(value: string | undefined, fallback: number) {
  if (value === undefined) return fallback;
  const rate = Number(value);
  if (!Number.isFinite(rate)) return fallback;
  return Math.min(1, Math.max(0, rate));
}

const tracesSampleRate = parseSampleRate(
  process.env.SENTRY_TRACES_SAMPLE_RATE ?? process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
  0.1
);

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Keep trace volume cheap by default. Raise SENTRY_TRACES_SAMPLE_RATE
  // temporarily during performance investigations or launches.
  tracesSampleRate,

  // Track slow transactions
  maxBreadcrumbs: 50,
  integrations: [
    Sentry.httpIntegration(),
  ],

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});

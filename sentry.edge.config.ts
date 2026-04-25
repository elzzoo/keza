// This file configures the initialization of Sentry on the **edge** runtime.
// The config you add here will be used whenever an edge route/middleware handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Low sample rate for edge — keeps quota manageable
  tracesSampleRate: 0.1,

  debug: false,
});

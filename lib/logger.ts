/**
 * lib/logger.ts
 *
 * Thin wrapper that logs to the console AND forwards to Sentry.
 * Use this instead of console.error in API routes and server libs.
 *
 * Why both?
 *  - console.error  → visible in Vercel function logs (operational debugging)
 *  - Sentry         → grouped, searchable, with stack traces and context
 *
 * Usage:
 *   import { logError } from "@/lib/logger";
 *   logError("[api/search]", err, { from, to }); // extra context is optional
 */

import * as Sentry from "@sentry/nextjs";

/**
 * Log an error to the console and capture it in Sentry.
 *
 * @param prefix  Short tag shown in Vercel logs, e.g. "[api/alerts]"
 * @param err     The caught error (any type — Sentry handles non-Error values)
 * @param context Optional key/value pairs attached as Sentry "extras"
 */
export function logError(
  prefix: string,
  err: unknown,
  context?: Record<string, unknown>
): void {
  // Always log to stdout so Vercel function logs stay useful
  console.error(
    prefix,
    err instanceof Error ? err.message : String(err),
    context ?? ""
  );

  // Forward to Sentry with optional extra context
  Sentry.withScope((scope) => {
    scope.setTag("prefix", prefix);
    if (context) {
      Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
    }
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
  });
}

/**
 * Log a warning (non-fatal) to Sentry as a message rather than an exception.
 */
export function logWarn(prefix: string, message: string, context?: Record<string, unknown>): void {
  console.warn(prefix, message, context ?? "");
  Sentry.withScope((scope) => {
    scope.setLevel("warning");
    scope.setTag("prefix", prefix);
    if (context) {
      Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
    }
    Sentry.captureMessage(`${prefix} ${message}`);
  });
}

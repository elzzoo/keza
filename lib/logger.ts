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
 * @param message Full log message (or short prefix when err is also supplied)
 * @param err     Optional caught error — when omitted the message is sent as-is
 * @param context Optional key/value pairs attached as Sentry "extras"
 */
export function logError(
  message: string,
  err?: unknown,
  context?: Record<string, unknown>
): void {
  // Always log to stdout so Vercel function logs stay useful
  if (err !== undefined) {
    console.error(message, err instanceof Error ? err.message : String(err), context ?? "");
  } else {
    console.error(message, context ?? "");
  }

  // Forward to Sentry with optional extra context
  Sentry.withScope((scope) => {
    scope.setTag("prefix", message);
    if (context) {
      Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
    }
    const sentryErr = err instanceof Error ? err : new Error(err !== undefined ? String(err) : message);
    Sentry.captureException(sentryErr);
  });
}

/**
 * Log a warning (non-fatal) to Sentry as a message rather than an exception.
 *
 * @param message Full warning message (or prefix when detail is also supplied)
 * @param detail  Optional secondary string appended to the Sentry message
 * @param context Optional key/value pairs attached as Sentry "extras"
 */
export function logWarn(message: string, detail?: string, context?: Record<string, unknown>): void {
  if (detail !== undefined) {
    console.warn(message, detail, context ?? "");
  } else {
    console.warn(message, context ?? "");
  }
  Sentry.withScope((scope) => {
    scope.setLevel("warning");
    scope.setTag("prefix", message);
    if (context) {
      Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
    }
    Sentry.captureMessage(detail !== undefined ? `${message} ${detail}` : message);
  });
}

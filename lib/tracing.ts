import "server-only";
import { headers } from "next/headers";
import * as Sentry from "@sentry/nextjs";

/**
 * Attach request context to Sentry for distributed tracing
 * Extracts requestId from x-request-id header and sets it in Sentry context
 */
export async function attachRequestContext(): Promise<void> {
  const headersList = await headers();
  const requestId = headersList.get("x-request-id");
  const traceparent = headersList.get("traceparent");

  if (requestId) {
    Sentry.setTag("request.id", requestId);
    Sentry.setContext("request", {
      id: requestId,
      url: headersList.get("x-forwarded-proto")
        ? `${headersList.get("x-forwarded-proto")}://${headersList.get("host")}${headersList.get("x-forwarded-path") || "/"}`
        : undefined,
    });
  }

  if (traceparent) {
    Sentry.setTag("trace.parent", traceparent);
  }
}

/**
 * Get the current request ID for logging
 */
export async function getRequestId(): Promise<string | null> {
  const headersList = await headers();
  return headersList.get("x-request-id");
}

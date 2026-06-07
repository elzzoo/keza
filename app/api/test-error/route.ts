import { NextResponse } from "next/server";

/**
 * GET /api/test-error
 *
 * Throws an error to test Sentry error capture.
 * Only available in development and with KEZA_TEST_MODE enabled.
 */
export async function GET() {
  // Only allow in development or with test mode enabled
  if (
    process.env.NODE_ENV !== "development" &&
    process.env.KEZA_TEST_MODE !== "true"
  ) {
    return NextResponse.json(
      { error: "Test endpoint not available" },
      { status: 404 }
    );
  }

  // Throw an error for Sentry to capture
  throw new Error("Test error from /api/test-error endpoint");
}

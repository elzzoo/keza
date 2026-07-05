import "server-only";

/**
 * Stub for sending miles alert emails via Resend.
 * Will be fully implemented in Task 4 with actual Resend integration.
 * For now, logs the alert and returns a mock response.
 */
export async function sendMilesAlertEmail({
  email,
  route,
  program,
  cpp,
  threshold,
  flight,
}: {
  email: string;
  route: string;
  program: string;
  cpp: number;
  threshold: number;
  flight?: unknown;
}): Promise<{ success: boolean; messageId?: string }> {
  console.log("[miles-alert-email] Stubbed email send", {
    email,
    route,
    program,
    cpp,
    threshold,
  });

  // Stub response: always succeeds for now
  return {
    success: true,
    messageId: `mock-${Date.now()}`,
  };
}

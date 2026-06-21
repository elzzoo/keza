import "server-only";
import { randomBytes, timingSafeEqual } from "crypto";

/**
 * Generate a CSRF token: 16 random bytes as hex (32 characters)
 */
export function generateCsrfToken(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Verify a CSRF token using timing-safe comparison
 */
export function verifyCsrfToken(serverToken: string, clientToken: string): boolean {
  // Length check first (leaking length is acceptable in protocol)
  if (!serverToken || !clientToken || serverToken.length !== clientToken.length) {
    return false;
  }

  try {
    return timingSafeEqual(
      Buffer.from(serverToken),
      Buffer.from(clientToken)
    );
  } catch {
    return false;
  }
}

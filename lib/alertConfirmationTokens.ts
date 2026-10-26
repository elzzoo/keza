import "server-only";
import { createHash, randomBytes } from "crypto";

const TOKEN_BYTES = 32;
const TOKEN_LENGTH = 43;

export function hashAlertConfirmationToken(token: string): string | null {
  if (typeof token !== "string" || token.length !== TOKEN_LENGTH || !/^[A-Za-z0-9_-]+$/.test(token)) {
    return null;
  }

  const bytes = Buffer.from(token, "base64url");
  if (bytes.length !== TOKEN_BYTES || bytes.toString("base64url") !== token) {
    return null;
  }

  return createHash("sha256").update(bytes).digest("hex");
}

export function generateAlertConfirmationToken(): { token: string; tokenHash: string } {
  const bytes = randomBytes(TOKEN_BYTES);
  return {
    token: bytes.toString("base64url"),
    tokenHash: createHash("sha256").update(bytes).digest("hex"),
  };
}

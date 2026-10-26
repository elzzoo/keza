import { createHash } from "crypto";
import {
  generateAlertConfirmationToken,
  hashAlertConfirmationToken,
} from "@/lib/alertConfirmationTokens";

describe("alert confirmation capabilities", () => {
  it("generates distinct 32-byte tokens whose digest is not the token", () => {
    const first = generateAlertConfirmationToken();
    const second = generateAlertConfirmationToken();

    expect(first.token).not.toBe(second.token);
    expect(first.token).toHaveLength(43);
    expect(Buffer.from(first.token, "base64url")).toHaveLength(32);
    expect(first.tokenHash).not.toBe(first.token);
    expect(first.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(hashAlertConfirmationToken(first.token)).toBe(first.tokenHash);
    expect(hashAlertConfirmationToken(second.token)).toBe(second.tokenHash);
  });

  it("hashes decoded bytes rather than the encoded text", () => {
    const { token, tokenHash } = generateAlertConfirmationToken();
    expect(tokenHash).toBe(createHash("sha256").update(Buffer.from(token, "base64url")).digest("hex"));
    expect(tokenHash).not.toBe(createHash("sha256").update(token).digest("hex"));
  });

  it.each(["", "abc", "a".repeat(44), "!".repeat(43), "a".repeat(42) + "=", "é".repeat(43)])(
    "rejects malformed token %s",
    (token) => {
      expect(hashAlertConfirmationToken(token)).toBeNull();
    }
  );

  it("rejects a noncanonical final base64url character", () => {
    const { token } = generateAlertConfirmationToken();
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    const final = alphabet.indexOf(token.at(-1)!);
    const mutated = token.slice(0, -1) + alphabet[final ^ 1];
    expect(Buffer.from(mutated, "base64url")).toEqual(Buffer.from(token, "base64url"));
    expect(hashAlertConfirmationToken(mutated)).toBeNull();
  });

  it("changes the digest when a canonical token byte changes", () => {
    const { token, tokenHash } = generateAlertConfirmationToken();
    const bytes = Buffer.from(token, "base64url");
    bytes[0] ^= 1;
    expect(hashAlertConfirmationToken(bytes.toString("base64url"))).not.toBe(tokenHash);
  });
});

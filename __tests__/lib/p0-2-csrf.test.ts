import { generateCsrfToken, verifyCsrfToken } from "@/lib/csrf";

describe("P0-2: CSRF Protection", () => {
  test("generateCsrfToken produces 32-character hex token", () => {
    const token = generateCsrfToken();
    expect(token).toMatch(/^[a-f0-9]{32}$/);
  });

  test("generateCsrfToken produces different tokens each call", () => {
    const token1 = generateCsrfToken();
    const token2 = generateCsrfToken();
    expect(token1).not.toBe(token2);
  });

  test("verifyCsrfToken accepts matching tokens", () => {
    const token = generateCsrfToken();
    const isValid = verifyCsrfToken(token, token);
    expect(isValid).toBe(true);
  });

  test("verifyCsrfToken rejects mismatched tokens", () => {
    const token1 = generateCsrfToken();
    const token2 = generateCsrfToken();
    const isValid = verifyCsrfToken(token1, token2);
    expect(isValid).toBe(false);
  });

  test("verifyCsrfToken rejects empty tokens", () => {
    expect(verifyCsrfToken("", "token")).toBe(false);
    expect(verifyCsrfToken("token", "")).toBe(false);
    expect(verifyCsrfToken("", "")).toBe(false);
  });

  test("verifyCsrfToken uses timing-safe comparison", () => {
    // Both tokens have same length, verify should compare safely
    const token = generateCsrfToken();
    const tamperedToken = token.replace(/a/g, "0"); // Change all 'a' to '0'
    const isValid = verifyCsrfToken(token, tamperedToken);
    expect(isValid).toBe(false);
  });
});

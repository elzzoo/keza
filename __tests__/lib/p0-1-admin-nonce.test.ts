import { createAdminSessionToken, verifyAdminSessionToken } from "@/lib/auth";

describe("P0-1: Admin Session Token Nonce", () => {
  const ADMIN_SECRET = "test-secret-key";
  const originalEnv = process.env.ADMIN_SECRET;

  beforeAll(() => {
    process.env.ADMIN_SECRET = ADMIN_SECRET;
  });

  afterAll(() => {
    process.env.ADMIN_SECRET = originalEnv;
  });

  test("token includes nonce component (16-byte random hex)", () => {
    const token1 = createAdminSessionToken();
    const token2 = createAdminSessionToken();

    expect(token1).toBeTruthy();
    expect(token2).toBeTruthy();
    // Token format should be: exp.nonce.sig (3 parts separated by dots)
    const parts1 = (token1 as string).split(".");
    const parts2 = (token2 as string).split(".");

    expect(parts1.length).toBe(3);
    expect(parts2.length).toBe(3);

    // Nonce should be 32 hex characters (16 bytes = 32 hex digits)
    expect(parts1[1]).toMatch(/^[a-f0-9]{32}$/);
    expect(parts2[1]).toMatch(/^[a-f0-9]{32}$/);

    // Each token's nonce should be different (with extremely high probability)
    expect(parts1[1]).not.toBe(parts2[1]);
  });

  test("verification accepts valid token with nonce", () => {
    const token = createAdminSessionToken();
    const now = Date.now();

    const isValid = verifyAdminSessionToken(token ?? undefined, now);
    expect(isValid).toBe(true);
  });

  test("verification rejects token with tampered nonce", () => {
    const token = createAdminSessionToken();
    const parts = (token as string).split(".");
    // Tamper with nonce
    const tamperedToken = `${parts[0]}.0000000000000000000000000000000.${parts[2]}`;

    const isValid = verifyAdminSessionToken(tamperedToken);
    expect(isValid).toBe(false);
  });

  test("verification rejects token with removed nonce (old format)", () => {
    // Old format: exp.sig (2 parts)
    const oldToken = "1234567890.somesignature";
    const isValid = verifyAdminSessionToken(oldToken);
    expect(isValid).toBe(false);
  });

  test("nonce is different on every token call", () => {
    const tokens = Array.from(
      { length: 5 },
      () => createAdminSessionToken() || ""
    );
    const nonces = tokens
      .filter((t) => t !== "")
      .map((t) => t.split(".")[1]);

    // All nonces should be unique
    const uniqueNonces = new Set(nonces);
    expect(uniqueNonces.size).toBe(5);
  });
});

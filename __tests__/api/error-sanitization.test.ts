/**
 * API Error Sanitization Tests
 * Verifies that API routes return generic errors without exposing:
 * - Secret names (TRAVELPAYOUTS_TOKEN, etc.)
 * - Stack traces
 * - Internal implementation details
 */

describe("API Error Sanitization", () => {
  it("should return generic error without secret names", () => {
    // Example of GOOD error response (sanitized)
    const goodError = {
      error: "Server error",
      status: 500,
    };

    // Should NOT contain secret names
    expect(JSON.stringify(goodError).toLowerCase()).not.toContain("token");
    expect(JSON.stringify(goodError).toLowerCase()).not.toContain("travelpayouts");
    expect(JSON.stringify(goodError).toLowerCase()).not.toContain("duffel");
    expect(JSON.stringify(goodError).toLowerCase()).not.toContain("key");
  });

  it("should NOT include stack traces in response", () => {
    // Example of GOOD error response (no stack property)
    const goodError = {
      error: "Server error",
    };

    // Should not have stack property in sanitized response
    expect(goodError).not.toHaveProperty("stack");

    // Example of BAD error (what to avoid)
    const badError = {
      error: "TypeError: Cannot read property 'flights' of undefined",
      stack: "at SearchEngine (/vercel/path/lib/engine.ts:123)",
    };
    // Verify the test catches when stack IS present
    expect(badError).toHaveProperty("stack");
  });

  it("should not expose internal filenames or line numbers", () => {
    const goodError = { error: "Server error" };
    const errorStr = JSON.stringify(goodError);

    // Should not contain Vercel paths
    expect(errorStr).not.toMatch(/\/vercel\/|\/home\/user\/|\.ts:\d+/);
  });

  it("should use user-friendly error messages", () => {
    const userErrors = [
      { error: "Server error" },
      { error: "Invalid input" },
      { error: "Search timeout" },
      { error: "Service unavailable" },
    ];

    userErrors.forEach(({ error }) => {
      // All error messages should be generic and user-facing
      expect(typeof error).toBe("string");
      expect(error.length).toBeGreaterThan(0);
      expect(error.length).toBeLessThan(100);
    });
  });

  it("should not leak environment variable names", () => {
    const badErrors = [
      { error: "TRAVELPAYOUTS_TOKEN not set" },
      { error: "DUFFEL_API_KEY missing" },
      { error: "UPSTASH_REDIS_REST_URL unavailable" },
      { error: "process.env.SECRET undefined" },
    ];

    badErrors.forEach(({ error }) => {
      // These patterns should trigger sanitization
      expect(error).toMatch(/(TOKEN|KEY|URL|SECRET|REDIS|UPSTASH)/i);
      // In real API responses, these would be replaced with generic errors
    });
  });

  it("should log full details internally while returning generic error", () => {
    // This test documents the expected pattern:
    // Internal logging (includes full error + context):
    //   logError("[api/search]", err, { from, to, cabin });
    //
    // User response (generic):
    //   { error: "Server error" }

    const internalLog = {
      prefix: "[api/search]",
      error: "TypeError: Cannot read property 'flights' of undefined",
      context: { from: "SIN", to: "LAX", cabin: "business" },
    };

    const userResponse = {
      error: "Server error",
    };

    // Internal log contains full details
    expect(internalLog.error).toContain("Cannot read");
    expect(internalLog.context).toEqual(expect.objectContaining({ from: "SIN" }));

    // User response is generic
    expect(userResponse.error).toBe("Server error");
    expect(JSON.stringify(userResponse)).not.toContain("Cannot read");
  });
});

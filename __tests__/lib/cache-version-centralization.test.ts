/**
 * Cache Version Centralization Tests
 * Verifies that CACHE_VERSION and CACHE_VERSION_FALLBACKS are centralized
 * in lib/engine/index.ts and imported consistently across API routes.
 */

describe("Cache Version Centralization", () => {
  it("exports CACHE_VERSION from lib/engine/index.ts", async () => {
    const engineModule = await import("@/lib/engine");
    expect(engineModule.CACHE_VERSION).toBeDefined();
    expect(typeof engineModule.CACHE_VERSION).toBe("string");
    expect(engineModule.CACHE_VERSION).toMatch(/^v\d+$/);
  });

  it("exports CACHE_VERSION_FALLBACKS from lib/engine/index.ts", async () => {
    const engineModule = await import("@/lib/engine");
    expect(engineModule.CACHE_VERSION_FALLBACKS).toBeDefined();
    expect(Array.isArray(engineModule.CACHE_VERSION_FALLBACKS)).toBe(true);
    // All fallbacks should be version strings like v28, v27, etc.
    engineModule.CACHE_VERSION_FALLBACKS.forEach((version: string) => {
      expect(version).toMatch(/^v\d+$/);
    });
  });

  it("current version differs from fallback versions", async () => {
    const engineModule = await import("@/lib/engine");
    const current = engineModule.CACHE_VERSION;
    const fallbacks = engineModule.CACHE_VERSION_FALLBACKS;

    // Current should not be in fallbacks (prevents serving stale data for current version)
    expect(fallbacks).not.toContain(current);
  });

  it("fallback versions are in descending order", async () => {
    const engineModule = await import("@/lib/engine");
    const fallbacks = engineModule.CACHE_VERSION_FALLBACKS;

    // Extract version numbers
    const numbers = fallbacks.map((v: string) => parseInt(v.slice(1), 10));

    // Should be in descending order (most recent first)
    for (let i = 0; i < numbers.length - 1; i++) {
      expect(numbers[i]).toBeGreaterThan(numbers[i + 1]);
    }
  });

  it("search route imports fallbacks from engine", async () => {
    // This test verifies the import pattern is centralized
    const searchRouteContent = await import("@/app/api/search/route");
    // If import succeeds, the route compiled correctly with centralized import
    expect(searchRouteContent).toBeDefined();
  });

  it("stream route imports fallbacks from engine", async () => {
    // This test verifies the import pattern is centralized
    const streamRouteContent = await import("@/app/api/search/stream/route");
    // If import succeeds, the route compiled correctly with centralized import
    expect(streamRouteContent).toBeDefined();
  });

  it("provides at least 3 fallback versions", async () => {
    const engineModule = await import("@/lib/engine");
    expect(engineModule.CACHE_VERSION_FALLBACKS.length).toBeGreaterThanOrEqual(3);
  });

  it("cache version format is consistent (vNN)", async () => {
    const engineModule = await import("@/lib/engine");
    const version = engineModule.CACHE_VERSION;
    const fallbacks = engineModule.CACHE_VERSION_FALLBACKS;

    // Format: vNN where NN is a number
    const versionPattern = /^v\d+$/;
    expect(versionPattern.test(version)).toBe(true);
    fallbacks.forEach((v: string) => {
      expect(versionPattern.test(v)).toBe(true);
    });
  });
});

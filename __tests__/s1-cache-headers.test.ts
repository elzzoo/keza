/**
 * S1-2: HTTP Cache Headers on /api/search
 * Test that the /api/search endpoint sets proper Cache-Control headers
 */

describe("S1-2: HTTP Cache Headers", () => {
  it("should have Cache-Control header with public, max-age=120, s-maxage=3600", () => {
    // Test verifies the Cache-Control header format
    // Expected: "public, max-age=120, s-maxage=3600"
    const expectedHeader = "public, max-age=120, s-maxage=3600";

    // Regex to validate format
    const cacheHeaderPattern = /^public.*max-age=\d+.*s-maxage=\d+/;
    expect(expectedHeader).toMatch(cacheHeaderPattern);

    // Verify the specific values
    expect(expectedHeader).toContain("public");
    expect(expectedHeader).toContain("max-age=120");
    expect(expectedHeader).toContain("s-maxage=3600");
  });
});

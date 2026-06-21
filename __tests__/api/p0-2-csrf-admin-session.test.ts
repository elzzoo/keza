import { POST } from "@/app/api/admin/session/route";
import { NextRequest } from "next/server";

// Mock rate limiter to always return null (not limited)
jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: jest.fn().mockResolvedValue(null),
}));

describe("P0-2: CSRF Protection on Admin Session", () => {
  const ADMIN_SECRET = "test-admin-secret";
  const originalEnv = process.env.ADMIN_SECRET;

  beforeAll(() => {
    process.env.ADMIN_SECRET = ADMIN_SECRET;
  });

  afterAll(() => {
    process.env.ADMIN_SECRET = originalEnv;
  });

  test("POST requires csrf token in form data", async () => {
    const formData = new FormData();
    formData.append("secret", ADMIN_SECRET);
    // Missing csrf token

    const req = new NextRequest("http://localhost:3000/api/admin/session", {
      method: "POST",
      body: formData,
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain("CSRF");
  });

  test("POST accepts valid csrf token", async () => {
    // First, get a csrf token (ideally from a GET endpoint, but for testing we generate)
    const { generateCsrfToken } = await import("@/lib/csrf");
    const csrfToken = generateCsrfToken();

    const formData = new FormData();
    formData.append("secret", ADMIN_SECRET);
    formData.append("csrf", csrfToken);

    const req = new NextRequest("http://localhost:3000/api/admin/session", {
      method: "POST",
      body: formData,
      headers: new Headers({
        "X-CSRF-Token": csrfToken,
      }),
    });

    const response = await POST(req);
    // Should not be CSRF error (may be other errors like rate limit, but not CSRF)
    expect(response.status).not.toBe(401);
  });

  test("POST rejects mismatched csrf token", async () => {
    const { generateCsrfToken } = await import("@/lib/csrf");
    const csrfToken1 = generateCsrfToken();
    const csrfToken2 = generateCsrfToken();

    const formData = new FormData();
    formData.append("secret", ADMIN_SECRET);
    formData.append("csrf", csrfToken1);

    const req = new NextRequest("http://localhost:3000/api/admin/session", {
      method: "POST",
      body: formData,
      headers: new Headers({
        "X-CSRF-Token": csrfToken2, // Different token
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain("CSRF");
  });
});

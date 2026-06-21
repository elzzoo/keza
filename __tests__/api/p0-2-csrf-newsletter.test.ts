import { POST } from "@/app/api/newsletter/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: jest.fn().mockResolvedValue(null),
}));

jest.mock("resend", () => ({
  Resend: jest.fn(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: "email-123" }),
    },
  })),
}));

jest.mock("@/lib/redis", () => ({
  redis: {
    zscore: jest.fn().mockResolvedValue(null),
    zadd: jest.fn().mockResolvedValue(1),
  },
}));

describe("P0-2: CSRF Protection on Newsletter", () => {
  test("POST requires csrf token", async () => {
    const body = JSON.stringify({ email: "test@example.com", lang: "en" });

    const req = new NextRequest("http://localhost:3000/api/newsletter", {
      method: "POST",
      body,
      headers: new Headers({
        "Content-Type": "application/json",
        // Missing X-CSRF-Token
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toContain("CSRF");
  });

  test("POST accepts valid csrf token", async () => {
    const { generateCsrfToken } = await import("@/lib/csrf");
    const csrfToken = generateCsrfToken();

    const body = JSON.stringify({ email: "test@example.com", lang: "en" });

    const req = new NextRequest("http://localhost:3000/api/newsletter", {
      method: "POST",
      body,
      headers: new Headers({
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      }),
    });

    const response = await POST(req);
    // Should not be 401 CSRF error
    expect(response.status).not.toBe(401);
  });

  test("POST rejects empty/missing csrf token", async () => {
    const body = JSON.stringify({ email: "test@example.com", lang: "en" });

    const req = new NextRequest("http://localhost:3000/api/newsletter", {
      method: "POST",
      body,
      headers: new Headers({
        "Content-Type": "application/json",
        // No X-CSRF-Token header
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toContain("CSRF");
  });
});

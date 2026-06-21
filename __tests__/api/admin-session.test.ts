const mockRateLimitResponse = jest.fn();
const mockSafeCompare = jest.fn();
const mockCreateAdminSessionToken = jest.fn();
const mockAdminSessionMaxAgeSeconds = jest.fn();

jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: (...args: unknown[]) => mockRateLimitResponse(...args),
}));

jest.mock("@/lib/auth", () => ({
  ADMIN_SESSION_COOKIE: "keza_admin_session",
  safeCompare: (...args: unknown[]) => mockSafeCompare(...args),
  createAdminSessionToken: () => mockCreateAdminSessionToken(),
  adminSessionMaxAgeSeconds: () => mockAdminSessionMaxAgeSeconds(),
}));

import { NextRequest } from "next/server";
import { POST, DELETE } from "@/app/api/admin/session/route";

const OLD_ENV = process.env;

async function makeLoginRequest(secret?: string, method?: string): Promise<NextRequest> {
  const url = method === "DELETE"
    ? "http://localhost/api/admin/session?_method=DELETE"
    : "http://localhost/api/admin/session";

  const form = new FormData();
  if (secret) form.append("secret", secret);

  // Add CSRF token (required by P0-2)
  const { generateCsrfToken } = await import("@/lib/csrf");
  const csrfToken = generateCsrfToken();
  form.append("csrf", csrfToken);

  return new NextRequest(url, { method: "POST", body: form });
}

describe("POST /api/admin/session", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV, ADMIN_SECRET: "correct-secret" };
    mockRateLimitResponse.mockResolvedValue(null);
    mockSafeCompare.mockReturnValue(false);
    mockCreateAdminSessionToken.mockReturnValue("session-token-abc");
    mockAdminSessionMaxAgeSeconds.mockReturnValue(3600);
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe("logout via _method=DELETE", () => {
    it("redirects to /admin and clears session cookie", async () => {
      const req = await makeLoginRequest(undefined, "DELETE");
      const res = await POST(req);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toMatch(/\/admin/);
      const cookie = res.cookies.get("keza_admin_session");
      expect(cookie?.value).toBe("");
    });

    it("does NOT hit the rate limiter on logout", async () => {
      const req = await makeLoginRequest(undefined, "DELETE");
      await POST(req);
      expect(mockRateLimitResponse).not.toHaveBeenCalled();
    });
  });

  describe("rate limiting", () => {
    it("returns 429 when rate limited", async () => {
      const { NextResponse } = await import("next/server");
      mockRateLimitResponse.mockResolvedValue(
        NextResponse.json({ error: "Too many requests" }, { status: 429 })
      );
      const req = await makeLoginRequest("wrong-secret");
      const res = await POST(req);
      expect(res.status).toBe(429);
    });
  });

  describe("wrong secret", () => {
    it("redirects to /admin without setting session cookie", async () => {
      mockSafeCompare.mockReturnValue(false);
      const req = await makeLoginRequest("wrong-secret");
      const res = await POST(req);
      expect(res.status).toBe(303);
      const cookie = res.cookies.get("keza_admin_session");
      // Cookie cleared (maxAge=0) on failed login
      expect(cookie?.maxAge ?? 0).toBe(0);
    });
  });

  describe("correct secret", () => {
    it("redirects to /admin and sets httpOnly session cookie", async () => {
      mockSafeCompare.mockReturnValue(true);
      const req = await makeLoginRequest("correct-secret");
      const res = await POST(req);
      expect(res.status).toBe(303);
      const cookie = res.cookies.get("keza_admin_session");
      expect(cookie?.value).toBe("session-token-abc");
      expect(cookie?.httpOnly).toBe(true);
      expect(cookie?.path).toBe("/admin");
    });

    it("clears session when token creation fails", async () => {
      mockSafeCompare.mockReturnValue(true);
      mockCreateAdminSessionToken.mockReturnValue(null);
      const req = await makeLoginRequest("correct-secret");
      const res = await POST(req);
      expect(res.status).toBe(303);
      const cookie = res.cookies.get("keza_admin_session");
      expect(cookie?.value).toBe("");
    });
  });
});

describe("DELETE /api/admin/session", () => {
  it("redirects to /admin and clears session cookie", async () => {
    const req = new NextRequest("http://localhost/api/admin/session", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(303);
    const cookie = res.cookies.get("keza_admin_session");
    expect(cookie?.value).toBe("");
  });
});

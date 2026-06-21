const mockRedisLpush = jest.fn();
const mockRedisLtrim = jest.fn();
const mockRateLimitResponse = jest.fn();
const mockResendSend = jest.fn();
const mockSendDiscordAlert = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: {
    lpush: (...args: unknown[]) => mockRedisLpush(...args),
    ltrim: (...args: unknown[]) => mockRedisLtrim(...args),
  },
}));

jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: (...args: unknown[]) => mockRateLimitResponse(...args),
}));

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: (...args: unknown[]) => mockResendSend(...args) },
  })),
}));

jest.mock("@/lib/discord", () => ({
  sendDiscordAlert: (...args: unknown[]) => mockSendDiscordAlert(...args),
}));

jest.mock("@/lib/logger", () => ({
  logError: jest.fn(),
}));

jest.mock("@/lib/siteConfig", () => ({
  SITE_URL: "https://keza.app",
}));

import { POST } from "@/app/api/contact/route";

const VALID_BODY = {
  name: "Mamadou Diallo",
  company: "Acme Corp",
  email: "mamadou@acme.com",
  teamSize: "10-50",
  message: "Interested in your product",
};

async function makeRequest(body: object): Promise<Request> {
  const { generateCsrfToken } = await import("@/lib/csrf");
  const csrfToken = generateCsrfToken();

  return new Request("http://localhost/api/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/contact", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimitResponse.mockResolvedValue(null);
    mockRedisLpush.mockResolvedValue(1);
    mockRedisLtrim.mockResolvedValue("OK");
    mockResendSend.mockResolvedValue({ id: "email-123" });
    mockSendDiscordAlert.mockResolvedValue(undefined);
  });

  describe("rate limiting", () => {
    it("returns 429 when rate limited", async () => {
      const { NextResponse } = await import("next/server");
      mockRateLimitResponse.mockResolvedValue(
        NextResponse.json({ error: "Too many requests" }, { status: 429 })
      );
      const res = await POST(await makeRequest(VALID_BODY));
      expect(res.status).toBe(429);
    });
  });

  describe("input validation", () => {
    it("returns 400 when name is missing", async () => {
      const res = await POST(await makeRequest({ ...VALID_BODY, name: "" }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBeTruthy();
    });

    it("returns 400 when company is missing", async () => {
      const res = await POST(await makeRequest({ ...VALID_BODY, company: "" }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when email is missing", async () => {
      const res = await POST(await makeRequest({ ...VALID_BODY, email: "" }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when teamSize is missing", async () => {
      const res = await POST(await makeRequest({ ...VALID_BODY, teamSize: "" }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when email is invalid", async () => {
      const res = await POST(await makeRequest({ ...VALID_BODY, email: "not-an-email" }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Invalid email/);
    });

    it("returns 400 when name exceeds 100 characters", async () => {
      const res = await POST(await makeRequest({ ...VALID_BODY, name: "a".repeat(101) }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when message exceeds 2000 characters", async () => {
      const res = await POST(await makeRequest({ ...VALID_BODY, message: "x".repeat(2001) }));
      expect(res.status).toBe(400);
    });
  });

  describe("successful submission", () => {
    it("returns 201 on valid submission", async () => {
      const res = await POST(await makeRequest(VALID_BODY));
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.ok).toBe(true);
    });

    it("stores lead in Redis", async () => {
      await POST(await makeRequest(VALID_BODY));
      expect(mockRedisLpush).toHaveBeenCalledWith(
        "keza:b2b:leads",
        expect.stringContaining("mamadou@acme.com")
      );
      expect(mockRedisLtrim).toHaveBeenCalledWith("keza:b2b:leads", 0, 499);
    });

    it("succeeds even when message is omitted", async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { message: _, ...noMessage } = VALID_BODY;
      const res = await POST(await makeRequest(noMessage));
      expect(res.status).toBe(201);
    });
  });
});

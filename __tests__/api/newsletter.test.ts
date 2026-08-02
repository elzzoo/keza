const mockRedisZscore = jest.fn();
const mockRedisZadd = jest.fn();
const mockRedisZcard = jest.fn();
const mockRateLimitResponse = jest.fn();
const mockResendSend = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: {
    zscore: (...args: unknown[]) => mockRedisZscore(...args),
    zadd: (...args: unknown[]) => mockRedisZadd(...args),
    zcard: (...args: unknown[]) => mockRedisZcard(...args),
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

jest.mock("@/lib/logger", () => ({
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

import { POST } from "@/app/api/newsletter/route";
import { NextRequest } from "next/server";

function makeRequest(body: object): NextRequest {
  return new NextRequest("http://localhost/api/newsletter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/newsletter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimitResponse.mockResolvedValue(null);
    mockRedisZscore.mockResolvedValue(null);
    mockRedisZadd.mockResolvedValue(1);
    mockResendSend.mockResolvedValue({ data: { id: "email_1" } });
  });

  it("returns 201 and subscribes a valid new email", async () => {
    const res = await POST(makeRequest({ email: "user@example.com" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockRedisZadd).toHaveBeenCalledWith(
      "keza:newsletter:subscribers",
      expect.objectContaining({ member: "user@example.com" })
    );
  });

  it("returns 400 for an invalid email", async () => {
    const res = await POST(makeRequest({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Email invalide");
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("reports alreadySubscribed instead of re-adding an existing email", async () => {
    mockRedisZscore.mockResolvedValueOnce(1700000000000);
    const res = await POST(makeRequest({ email: "user@example.com" }));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.alreadySubscribed).toBe(true);
    expect(mockRedisZadd).not.toHaveBeenCalled();
  });

  it("returns 400 (not 500) for malformed JSON", async () => {
    // request.json() throws a SyntaxError on unparseable bodies — a client
    // error, but it used to fall into the catch-all and come back as a 500
    // "Erreur interne" like a real backend failure.
    const req = new NextRequest("http://localhost/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ not valid json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid JSON body");
  });
});

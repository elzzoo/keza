const mockSet = jest.fn();
const mockIncr = jest.fn();
const mockTtl = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: {
    set: (...args: unknown[]) => mockSet(...args),
    incr: (...args: unknown[]) => mockIncr(...args),
    ttl: (...args: unknown[]) => mockTtl(...args),
  },
}));

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/ratelimit";

function makeRequest(ip = "203.0.113.10"): NextRequest {
  return new NextRequest("http://localhost/api/test", {
    headers: { "x-forwarded-for": ip },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSet.mockResolvedValue("OK");
  mockTtl.mockResolvedValue(60);
});

describe("checkRateLimit", () => {
  it("uses SET NX EX to create the key with TTL, then increments", async () => {
    mockIncr.mockResolvedValue(1);

    const result = await checkRateLimit(makeRequest(), {
      namespace: "api:test",
      limit: 2,
      windowSeconds: 60,
    });

    expect(result.limited).toBe(false);
    expect(result.remaining).toBe(1);
    // SET NX EX is called first to initialise the key with its TTL
    expect(mockSet).toHaveBeenCalledWith(
      "keza:ratelimit:api:test:203.0.113.10",
      "0",
      { ex: 60, nx: true }
    );
    // Then INCR is called to bump the counter
    expect(mockIncr).toHaveBeenCalledWith("keza:ratelimit:api:test:203.0.113.10");
  });

  it("marks the request as limited when the count exceeds the limit", async () => {
    mockIncr.mockResolvedValue(3);

    const result = await checkRateLimit(makeRequest(), {
      namespace: "api:test",
      limit: 2,
      windowSeconds: 60,
    });

    expect(result.limited).toBe(true);
    expect(result.remaining).toBe(0);
  });
});

describe("rateLimitResponse", () => {
  it("returns a 429 response when limited", async () => {
    mockIncr.mockResolvedValue(4);

    const res = await rateLimitResponse(makeRequest(), {
      namespace: "api:test",
      limit: 2,
      windowSeconds: 60,
    });

    expect(res?.status).toBe(429);
    expect(res?.headers.get("Retry-After")).toBe("60");
    expect(await res?.json()).toEqual({
      error: "Too many requests. Please try again later.",
    });
  });
});

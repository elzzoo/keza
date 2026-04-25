const mockIncr = jest.fn();
const mockExpire = jest.fn();
const mockTtl = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: {
    incr: (...args: unknown[]) => mockIncr(...args),
    expire: (...args: unknown[]) => mockExpire(...args),
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
  mockTtl.mockResolvedValue(60);
});

describe("checkRateLimit", () => {
  it("increments a namespaced key and sets expiry on first hit", async () => {
    mockIncr.mockResolvedValue(1);
    mockExpire.mockResolvedValue(1);

    const result = await checkRateLimit(makeRequest(), {
      namespace: "api:test",
      limit: 2,
      windowSeconds: 60,
    });

    expect(result.limited).toBe(false);
    expect(result.remaining).toBe(1);
    expect(mockIncr).toHaveBeenCalledWith("keza:ratelimit:api:test:203.0.113.10");
    expect(mockExpire).toHaveBeenCalledWith("keza:ratelimit:api:test:203.0.113.10", 60);
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
    expect(mockExpire).not.toHaveBeenCalled();
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

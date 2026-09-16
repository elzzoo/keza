const mockRateLimitResponse = jest.fn();

jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: (...args: unknown[]) => mockRateLimitResponse(...args),
}));

import { GET } from "@/app/api/version/route";

const OLD_ENV = process.env;

describe("GET /api/version", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimitResponse.mockResolvedValue(null);
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it("returns deployment metadata without secrets", async () => {
    process.env = {
      ...OLD_ENV,
      VERCEL_GIT_COMMIT_SHA: "abc123",
      VERCEL_GIT_COMMIT_REF: "main",
      VERCEL_ENV: "production",
      VERCEL_URL: "keza.example.vercel.app",
      NEXT_PUBLIC_BUILD_TIME: "2026-09-15T00:00:00.000Z",
      CRON_SECRET: "secret-value",
    };

    const res = await GET(new Request("http://localhost/api/version"));
    const data = await res.json();

    expect(data).toMatchObject({
      app: "xalifly",
      version: "0.1.0",
      sha: "abc123",
      branch: "main",
      env: "production",
      deploymentUrl: "keza.example.vercel.app",
      buildAt: "2026-09-15T00:00:00.000Z",
    });
    expect(JSON.stringify(data)).not.toContain("secret-value");
  });

  it("uses local fallbacks outside Vercel", async () => {
    process.env = { ...OLD_ENV };
    delete process.env.VERCEL_GIT_COMMIT_SHA;
    delete process.env.VERCEL_GIT_COMMIT_REF;
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_URL;
    delete process.env.NEXT_PUBLIC_BUILD_TIME;

    const res = await GET(new Request("http://localhost/api/version"));
    const data = await res.json();

    expect(data.sha).toBe("local");
    expect(data.branch).toBe("local");
    expect(data.env).toBe("local");
    expect(data.deploymentUrl).toBeNull();
    expect(data.buildAt).toBeNull();
  });

  it("returns 429 when rate limited", async () => {
    mockRateLimitResponse.mockResolvedValue(
      Response.json({ error: "Too many requests" }, { status: 429 })
    );

    const res = await GET(new Request("http://localhost/api/version"));

    expect(res.status).toBe(429);
  });
});

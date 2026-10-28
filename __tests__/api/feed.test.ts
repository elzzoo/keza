const mockRateLimitResponse = jest.fn();

jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: (...args: unknown[]) => mockRateLimitResponse(...args),
}));

import { GET } from "@/app/api/feed/route";
import { POPULAR_ROUTES } from "@/data/popularRoutes";
import { SITE_URL } from "@/lib/siteConfig";

describe("GET /api/feed", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimitResponse.mockResolvedValue(null);
  });

  it("lists popular routes without presenting them as fresh deals", async () => {
    const response = await GET(new Request("http://localhost/api/feed"));
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/rss+xml");
    expect(xml.match(/<item>/g)).toHaveLength(10);
    expect(xml).toContain("Comparaisons vols cash vs miles");
    expect(xml).toContain("Confirmez le tarif et la disponibilité");
    expect(xml).not.toMatch(/<pubDate>|<lastBuildDate>|temps réel|meilleurs deals/i);
    expect(xml).toContain(`<link>${SITE_URL}/flights/${POPULAR_ROUTES[0]}</link>`);
    expect(xml).toContain(`<guid isPermaLink="true">${SITE_URL}/flights/${POPULAR_ROUTES[0]}</guid>`);
  });

  it("preserves rate limiting", async () => {
    mockRateLimitResponse.mockResolvedValue(
      Response.json({ error: "Too many requests" }, { status: 429 })
    );

    const response = await GET(new Request("http://localhost/api/feed"));

    expect(response.status).toBe(429);
    expect(mockRateLimitResponse).toHaveBeenCalledWith(expect.any(Request), {
      namespace: "api:feed",
      limit: 120,
      windowSeconds: 60,
    });
  });
});

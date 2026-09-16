import { GET } from "@/app/api/unsplash/route";

const mockRateLimitResponse = jest.fn();
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockLogError = jest.fn();

jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: (...args: unknown[]) => mockRateLimitResponse(...args),
}));

jest.mock("@/lib/redis", () => ({
  redis: {
    get: (...args: unknown[]) => mockRedisGet(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
  },
}));

jest.mock("@/lib/logger", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

const OLD_ENV = process.env;

describe("GET /api/unsplash", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV, UNSPLASH_ACCESS_KEY: "unsplash-key" };
    mockRateLimitResponse.mockResolvedValue(null);
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue("OK");
    global.fetch = jest.fn(async () =>
      Response.json({
        urls: { regular: "https://images.unsplash.com/photo.jpg" },
        user: { name: "Jane Doe" },
      }),
    ) as jest.Mock;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("rejects missing queries", async () => {
    const res = await GET(new Request("http://localhost/api/unsplash"));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("query required");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("rejects queries outside the destination allowlist", async () => {
    const res = await GET(new Request("http://localhost/api/unsplash?query=random%20expensive%20query"));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("query not allowed");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("serves cached allowed destination photos", async () => {
    mockRedisGet.mockResolvedValueOnce({
      url: "https://cached.example/photo.jpg",
      credit: "Photo by Cached on Unsplash",
    });

    const res = await GET(new Request("http://localhost/api/unsplash?query=Paris%20%20Eiffel%20Tower"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.url).toBe("https://cached.example/photo.jpg");
    expect(mockRedisGet).toHaveBeenCalledWith("keza:unsplash:paris-eiffel-tower");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("fetches and caches allowed destination photos", async () => {
    const res = await GET(new Request("http://localhost/api/unsplash?query=paris%20eiffel%20tower"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      url: "https://images.unsplash.com/photo.jpg",
      credit: "Photo by Jane Doe on Unsplash",
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.unsplash.com/photos/random?query=paris%20eiffel%20tower&orientation=landscape&content_filter=high",
      { headers: { Authorization: "Client-ID unsplash-key" } },
    );
    expect(mockRedisSet).toHaveBeenCalledWith(
      "keza:unsplash:paris-eiffel-tower",
      { url: "https://images.unsplash.com/photo.jpg", credit: "Photo by Jane Doe on Unsplash" },
      expect.objectContaining({ ex: expect.any(Number) }),
    );
  });
});

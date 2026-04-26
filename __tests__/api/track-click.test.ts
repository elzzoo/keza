// __tests__/api/track-click.test.ts
// Note: this tests request validation only (Redis is mocked)
import { POST } from "@/app/api/track/click/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/redis", () => ({
  redis: {
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
  },
}));

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/track/click", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/track/click", () => {
  it("returns 200 for valid payload", async () => {
    const res = await POST(makeReq({ searchId: "abc123", route: "CDG-NRT", program: "Flying Blue" }));
    expect(res.status).toBe(200);
  });

  it("returns 400 when searchId is missing", async () => {
    const res = await POST(makeReq({ route: "CDG-NRT" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when route is missing", async () => {
    const res = await POST(makeReq({ searchId: "abc" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is not JSON", async () => {
    const req = new NextRequest("http://localhost/api/track/click", {
      method: "POST",
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

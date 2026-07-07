import { NextRequest } from "next/server";

const mockRecordSearchEvent = jest.fn();
jest.mock("@/lib/analytics/eventService", () => ({
  recordSearchEvent: (...args: unknown[]) => mockRecordSearchEvent(...args),
}));

jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: jest.fn().mockResolvedValue(null),
}));

jest.mock("server-only", () => ({}));

import { POST } from "@/app/api/analytics/search/route";

function makeReq(method: string, body?: unknown) {
  return new NextRequest("http://localhost/api/analytics/search", {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/analytics/search", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should record search event and return searchId", async () => {
    const mockSearchId = "123e4567-e89b-12d3-a456-426614174000";
    mockRecordSearchEvent.mockResolvedValueOnce(mockSearchId);

    const res = await POST(
      makeReq("POST", {
        userId: "user-123",
        route: "CDG-DKR",
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.searchId).toBe(mockSearchId);
    expect(data.route).toBe("CDG-DKR");
    expect(data.timestamp).toBeDefined();
    expect(mockRecordSearchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        route: "CDG-DKR",
      })
    );
  });

  it("should return 400 for missing required fields", async () => {
    const res = await POST(makeReq("POST", { userId: "user-123" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(mockRecordSearchEvent).not.toHaveBeenCalled();
  });

  it("should validate route format", async () => {
    const res = await POST(
      makeReq("POST", {
        userId: "user-123",
        route: "INVALID",
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(mockRecordSearchEvent).not.toHaveBeenCalled();
  });
});

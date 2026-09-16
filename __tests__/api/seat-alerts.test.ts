import { NextRequest, NextResponse } from "next/server";

const mockGetServerSession = jest.fn();
const mockSaveSeatAlert = jest.fn();
const mockDeleteSeatAlert = jest.fn();
const mockGetAllAlertsForEmail = jest.fn();
const mockRateLimitResponse = jest.fn<Promise<NextResponse | null>, [Request, unknown]>(async () => null);

jest.mock("next-auth/next", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
jest.mock("@/lib/auth", () => ({
  authOptions: {},
}));
jest.mock("@/lib/seatAlerts", () => ({
  saveSeatAlert: (...args: unknown[]) => mockSaveSeatAlert(...args),
  deleteSeatAlert: (...args: unknown[]) => mockDeleteSeatAlert(...args),
  getAllAlertsForEmail: (...args: unknown[]) => mockGetAllAlertsForEmail(...args),
}));
jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: (request: Request, options: unknown) => mockRateLimitResponse(request, options),
}));

import { POST, DELETE } from "@/app/api/alerts/seat/route";
import { GET } from "@/app/api/alerts/seat/my/route";

const SESSION = { user: { email: "user@example.com" } };

function jsonReq(method: string, body: unknown, path = "/api/alerts/seat") {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("seat alerts API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimitResponse.mockResolvedValue(null);
    mockGetServerSession.mockResolvedValue(SESSION);
  });

  it("rate-limits POST before auth and storage", async () => {
    mockRateLimitResponse.mockResolvedValueOnce(NextResponse.json({ error: "limited" }, { status: 429 }));

    const res = await POST(jsonReq("POST", { route: "SIN-LAX", cabin: "business", minPrice: 5000 }));

    expect(res.status).toBe(429);
    expect(mockGetServerSession).not.toHaveBeenCalled();
    expect(mockSaveSeatAlert).not.toHaveBeenCalled();
  });

  it("creates a seat alert for an authenticated user", async () => {
    mockSaveSeatAlert.mockResolvedValueOnce("seat_123");

    const res = await POST(jsonReq("POST", { route: "SIN-LAX", cabin: "business", minPrice: 5000 }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe("seat_123");
    expect(mockSaveSeatAlert).toHaveBeenCalledWith(expect.objectContaining({
      email: "user@example.com",
      route: "SIN-LAX",
      cabin: "BUSINESS",
      minPrice: 5000,
    }));
  });

  it("rejects unauthenticated POST requests", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);

    const res = await POST(jsonReq("POST", { route: "SIN-LAX", cabin: "business", minPrice: 5000 }));

    expect(res.status).toBe(401);
    expect(mockSaveSeatAlert).not.toHaveBeenCalled();
  });

  it("rate-limits DELETE before auth and storage", async () => {
    mockRateLimitResponse.mockResolvedValueOnce(NextResponse.json({ error: "limited" }, { status: 429 }));

    const res = await DELETE(jsonReq("DELETE", { route: "SIN-LAX", cabin: "business" }));

    expect(res.status).toBe(429);
    expect(mockGetServerSession).not.toHaveBeenCalled();
    expect(mockDeleteSeatAlert).not.toHaveBeenCalled();
  });

  it("deletes a seat alert for an authenticated user", async () => {
    const res = await DELETE(jsonReq("DELETE", { route: "SIN-LAX", cabin: "business" }));

    expect(res.status).toBe(200);
    expect(mockDeleteSeatAlert).toHaveBeenCalledWith("user@example.com", "SIN-LAX", "BUSINESS");
  });

  it("rate-limits GET /my before auth and storage", async () => {
    mockRateLimitResponse.mockResolvedValueOnce(NextResponse.json({ error: "limited" }, { status: 429 }));

    const res = await GET(new NextRequest("http://localhost/api/alerts/seat/my"));

    expect(res.status).toBe(429);
    expect(mockGetServerSession).not.toHaveBeenCalled();
    expect(mockGetAllAlertsForEmail).not.toHaveBeenCalled();
  });

  it("lists alerts for the authenticated user", async () => {
    mockGetAllAlertsForEmail.mockResolvedValueOnce([{ route: "SIN-LAX", cabin: "BUSINESS" }]);

    const res = await GET(new NextRequest("http://localhost/api/alerts/seat/my"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual([{ route: "SIN-LAX", cabin: "BUSINESS" }]);
    expect(mockGetAllAlertsForEmail).toHaveBeenCalledWith("user@example.com");
  });
});

import { NextRequest } from "next/server";

const mockGetServerSession = jest.fn();
jest.mock("next-auth/next", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

const mockGetProfile  = jest.fn();
const mockSaveProfile = jest.fn();
jest.mock("@/lib/serverProfile", () => ({
  getServerProfile:  (...args: unknown[]) => mockGetProfile(...args),
  saveServerProfile: (...args: unknown[]) => mockSaveProfile(...args),
}));

jest.mock("@/lib/auth", () => ({ authOptions: {} }));

// Mock server-only so it doesn't blow up in Jest
jest.mock("server-only", () => ({}));

// If rateLimitResponse exists in lib/ratelimit, mock it to return null (no limit):
jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: jest.fn().mockResolvedValue(null),
  rateLimit: jest.fn().mockResolvedValue({ success: true }),
}));

import { GET, PATCH } from "@/app/api/profile/route";

function makeReq(method: string, body?: unknown) {
  return new NextRequest("http://localhost/api/profile", {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { "Content-Type": "application/json" },
  });
}

describe("GET /api/profile", () => {
  it("returns 401 when no session", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns profile when session exists", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { email: "a@b.com" } });
    mockGetProfile.mockResolvedValueOnce({ balances: { "Flying Blue": 50000 } });
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.profile.balances["Flying Blue"]).toBe(50000);
  });

  it("returns null profile when key missing", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { email: "new@b.com" } });
    mockGetProfile.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.profile).toBeNull();
  });
});

describe("PATCH /api/profile", () => {
  it("returns 401 when no session", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await PATCH(makeReq("PATCH", { balances: {} }));
    expect(res.status).toBe(401);
  });

  it("saves profile and returns 200", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { email: "a@b.com" } });
    mockSaveProfile.mockResolvedValueOnce(undefined);
    const res = await PATCH(makeReq("PATCH", { balances: { "Flying Blue": 60000 } }));
    expect(res.status).toBe(200);
    expect(mockSaveProfile).toHaveBeenCalledWith("a@b.com", expect.objectContaining({ balances: { "Flying Blue": 60000 } }));
  });
});

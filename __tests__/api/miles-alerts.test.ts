import { NextRequest } from "next/server";

// Mock the miles-alerts library
const mockCreateMilesAlert = jest.fn();
const mockGetMilesAlertsByEmail = jest.fn();
const mockDeactivateMilesAlert = jest.fn();

jest.mock("@/lib/miles-alerts", () => ({
  createMilesAlert: (...args: unknown[]) => mockCreateMilesAlert(...args),
  getMilesAlertsByEmail: (...args: unknown[]) => mockGetMilesAlertsByEmail(...args),
  deactivateMilesAlert: (...args: unknown[]) => mockDeactivateMilesAlert(...args),
}));

// This route used to have no auth/rate-limit at all (see the due-diligence
// audit finding S-3: anyone could enumerate or delete alerts by guessing an
// email). GET/DELETE now require a "manage token" proving ownership — see
// app/api/miles-alerts/route.ts. Tests use a fixed VALID_TOKEN scoped to
// TOKEN_OWNER_EMAIL, and mock verification to require BOTH match — matching
// real behavior where the token is bound to a specific email — so tests for
// a mismatched email genuinely exercise the authorization branch instead of
// trivially passing.
const VALID_TOKEN = "test-manage-token";
const TOKEN_OWNER_EMAIL = "test@example.com";
jest.mock("@/lib/alertTokens", () => ({
  createManageAlertsToken: jest.fn(() => VALID_TOKEN),
  verifyManageAlertsToken: jest.fn(
    (email: string, token: string | null | undefined) =>
      token === VALID_TOKEN && email.toLowerCase().trim() === TOKEN_OWNER_EMAIL
  ),
}));
jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: jest.fn(async () => null),
}));

// Mock server-only so it doesn't blow up in Jest
jest.mock("server-only", () => ({}));

import { POST, GET, DELETE } from "@/app/api/miles-alerts/route";

function makeReq(
  method: string,
  body?: unknown,
  queryParams?: Record<string, string>,
  headers?: Record<string, string>
) {
  let url = "http://localhost/api/miles-alerts";
  if (queryParams) {
    const params = new URLSearchParams(queryParams);
    url += `?${params.toString()}`;
  }
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

const AUTH_HEADER = { Authorization: `Bearer ${VALID_TOKEN}` };

describe("POST /api/miles-alerts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Success case
  it("creates alert with valid request and returns 201 with a manage token", async () => {
    const body = {
      email: "test@example.com",
      route: "SIN-LAX",
      program: "Singapore KrisFlyer",
      thresholdCpp: 1.5,
    };
    mockCreateMilesAlert.mockResolvedValueOnce(undefined);
    const res = await POST(makeReq("POST", body));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toEqual({ ...body, manageToken: VALID_TOKEN });
    expect(mockCreateMilesAlert).toHaveBeenCalledWith({
      email: "test@example.com",
      route: "SIN-LAX",
      program: "Singapore KrisFlyer",
      thresholdCpp: 1.5,
    });
  });

  // Validation errors - missing fields
  it("returns 400 when email is missing", async () => {
    const body = {
      route: "SIN-LAX",
      program: "Singapore KrisFlyer",
      thresholdCpp: 1.5,
    };
    const res = await POST(makeReq("POST", body));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("returns 400 when route is missing", async () => {
    const body = {
      email: "test@example.com",
      program: "Singapore KrisFlyer",
      thresholdCpp: 1.5,
    };
    const res = await POST(makeReq("POST", body));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("returns 400 when program is missing", async () => {
    const body = {
      email: "test@example.com",
      route: "SIN-LAX",
      thresholdCpp: 1.5,
    };
    const res = await POST(makeReq("POST", body));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("returns 400 when thresholdCpp is missing", async () => {
    const body = {
      email: "test@example.com",
      route: "SIN-LAX",
      program: "Singapore KrisFlyer",
    };
    const res = await POST(makeReq("POST", body));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  // Validation errors - invalid thresholdCpp
  it("returns 400 when thresholdCpp is below 0.1", async () => {
    const body = {
      email: "test@example.com",
      route: "SIN-LAX",
      program: "Singapore KrisFlyer",
      thresholdCpp: 0.05,
    };
    const res = await POST(makeReq("POST", body));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("returns 400 when thresholdCpp is above 10", async () => {
    const body = {
      email: "test@example.com",
      route: "SIN-LAX",
      program: "Singapore KrisFlyer",
      thresholdCpp: 10.5,
    };
    const res = await POST(makeReq("POST", body));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  // Internal error
  it("returns 500 when createMilesAlert throws", async () => {
    const body = {
      email: "test@example.com",
      route: "SIN-LAX",
      program: "Singapore KrisFlyer",
      thresholdCpp: 1.5,
    };
    mockCreateMilesAlert.mockRejectedValueOnce(new Error("DB error"));
    const res = await POST(makeReq("POST", body));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Internal error");
  });
});

describe("GET /api/miles-alerts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Success case
  it("returns alerts with valid email + manage token and returns 200", async () => {
    const alerts = [
      {
        email: "test@example.com",
        route: "SIN-LAX",
        program: "Singapore KrisFlyer",
        thresholdCpp: 1.5,
        createdAt: 1234567890,
      },
      {
        email: "test@example.com",
        route: "SIN-JFK",
        program: "Flying Blue",
        thresholdCpp: 2.0,
        createdAt: 1234567891,
      },
    ];
    mockGetMilesAlertsByEmail.mockResolvedValueOnce(alerts);
    const res = await GET(makeReq("GET", undefined, { email: "test@example.com" }, AUTH_HEADER));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.alerts).toEqual(alerts);
    expect(mockGetMilesAlertsByEmail).toHaveBeenCalledWith("test@example.com");
  });

  // Empty alerts
  it("returns empty alerts array when none exist", async () => {
    mockGetMilesAlertsByEmail.mockResolvedValueOnce([]);
    const res = await GET(makeReq("GET", undefined, { email: "test@example.com" }, AUTH_HEADER));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.alerts).toEqual([]);
  });

  // Validation error - missing email
  it("returns 400 when email is missing", async () => {
    const res = await GET(makeReq("GET", undefined, {}, AUTH_HEADER));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  // Auth errors — the actual point of this route's fix
  it("returns 401 when no Authorization header is present", async () => {
    const res = await GET(makeReq("GET", undefined, { email: "test@example.com" }));
    expect(res.status).toBe(401);
    expect(mockGetMilesAlertsByEmail).not.toHaveBeenCalled();
  });

  it("returns 401 when the token doesn't match the email (can't enumerate another user's alerts)", async () => {
    const res = await GET(
      makeReq("GET", undefined, { email: "someone-else@example.com" }, AUTH_HEADER)
    );
    expect(res.status).toBe(401);
    expect(mockGetMilesAlertsByEmail).not.toHaveBeenCalled();
  });

  // Internal error
  it("returns 500 when getMilesAlertsByEmail throws", async () => {
    mockGetMilesAlertsByEmail.mockRejectedValueOnce(new Error("DB error"));
    const res = await GET(makeReq("GET", undefined, { email: "test@example.com" }, AUTH_HEADER));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Internal error");
  });
});

describe("DELETE /api/miles-alerts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Success case
  it("deletes alert and returns 200", async () => {
    const alertKey = "keza:miles-alert:test@example.com:SIN-LAX:Singapore KrisFlyer";
    const body = { alertId: alertKey };
    mockDeactivateMilesAlert.mockResolvedValueOnce(undefined);
    const res = await DELETE(makeReq("DELETE", body, undefined, AUTH_HEADER));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockDeactivateMilesAlert).toHaveBeenCalledWith(alertKey);
  });

  // Validation error - missing alertId
  it("returns 400 when alertId is missing", async () => {
    const body = {};
    const res = await DELETE(makeReq("DELETE", body, undefined, AUTH_HEADER));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  // Auth errors
  it("returns 401 when no Authorization header is present", async () => {
    const alertKey = "keza:miles-alert:test@example.com:SIN-LAX:Singapore KrisFlyer";
    const res = await DELETE(makeReq("DELETE", { alertId: alertKey }));
    expect(res.status).toBe(401);
    expect(mockDeactivateMilesAlert).not.toHaveBeenCalled();
  });

  it("returns 401 when the token doesn't match the alert's email (can't delete another user's alert)", async () => {
    const alertKey = "keza:miles-alert:someone-else@example.com:SIN-LAX:Singapore KrisFlyer";
    const res = await DELETE(makeReq("DELETE", { alertId: alertKey }, undefined, AUTH_HEADER));
    expect(res.status).toBe(401);
    expect(mockDeactivateMilesAlert).not.toHaveBeenCalled();
  });

  // Internal error
  it("returns 500 when deactivateMilesAlert throws", async () => {
    const alertKey = "keza:miles-alert:test@example.com:SIN-LAX:Singapore KrisFlyer";
    const body = { alertId: alertKey };
    mockDeactivateMilesAlert.mockRejectedValueOnce(new Error("DB error"));
    const res = await DELETE(makeReq("DELETE", body, undefined, AUTH_HEADER));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Internal error");
  });
});

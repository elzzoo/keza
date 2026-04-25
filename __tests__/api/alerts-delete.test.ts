// Mock @/lib/alerts entièrement — évite d'initialiser Redis en test
jest.mock("@/lib/alerts", () => ({
  deactivateAlert: jest.fn(),
  createAlert: jest.fn(),
  getAlertById: jest.fn(),
  getAlertsByEmail: jest.fn(),
}));
jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: jest.fn().mockResolvedValue(null),
}));
jest.mock("@/lib/alertTokens", () => ({
  verifyManageAlertsToken: jest.fn().mockReturnValue(true),
}));

import { NextRequest } from "next/server";
import { DELETE } from "@/app/api/alerts/route";
import { deactivateAlert, getAlertById } from "@/lib/alerts";

const mockDeactivate = deactivateAlert as jest.MockedFunction<typeof deactivateAlert>;
const mockGetAlertById = getAlertById as jest.MockedFunction<typeof getAlertById>;

function makeDeleteRequest(id?: string): NextRequest {
  const url = id
    ? `http://localhost/api/alerts?id=${id}&email=user%40example.com&token=test-token`
    : `http://localhost/api/alerts`;
  return new NextRequest(url, { method: "DELETE" });
}

describe("DELETE /api/alerts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAlertById.mockResolvedValue({
      id: "alt_abc_456",
      email: "user@example.com",
      from: "DSS",
      to: "CDG",
      cabin: "economy",
      basePrice: 500,
      targetPrice: 450,
      createdAt: "2026-04-01T00:00:00.000Z",
      notifCount: 0,
      active: true,
    });
  });

  it("retourne 400 si le param id est manquant", async () => {
    const res = await DELETE(makeDeleteRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("retourne 404 si l'alerte est introuvable", async () => {
    mockGetAlertById.mockResolvedValue(null);
    mockDeactivate.mockResolvedValue(false);
    const res = await DELETE(makeDeleteRequest("alt_unknown_123"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("retourne 200 et ok:true si l'alerte est désactivée", async () => {
    mockDeactivate.mockResolvedValue(true);
    const res = await DELETE(makeDeleteRequest("alt_abc_456"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

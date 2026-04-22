// Mock @/lib/alerts entièrement — évite d'initialiser Redis en test
jest.mock("@/lib/alerts", () => ({
  deactivateAlert: jest.fn(),
  createAlert: jest.fn(),
  getAlertsByEmail: jest.fn(),
}));

import { NextRequest } from "next/server";
import { DELETE } from "@/app/api/alerts/route";
import { deactivateAlert } from "@/lib/alerts";

const mockDeactivate = deactivateAlert as jest.MockedFunction<typeof deactivateAlert>;

function makeDeleteRequest(id?: string): NextRequest {
  const url = id
    ? `http://localhost/api/alerts?id=${id}`
    : `http://localhost/api/alerts`;
  return new NextRequest(url, { method: "DELETE" });
}

describe("DELETE /api/alerts", () => {
  beforeEach(() => jest.clearAllMocks());

  it("retourne 400 si le param id est manquant", async () => {
    const res = await DELETE(makeDeleteRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("retourne 404 si l'alerte est introuvable", async () => {
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

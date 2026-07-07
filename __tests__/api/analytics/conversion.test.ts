import { NextRequest } from "next/server";

const mockRecordConversionEvent = jest.fn();
jest.mock("@/lib/analytics/eventService", () => ({
  recordConversionEvent: (...args: unknown[]) => mockRecordConversionEvent(...args),
}));

jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: jest.fn().mockResolvedValue(null),
}));

jest.mock("server-only", () => ({}));

import { POST } from "@/app/api/analytics/conversion/route";

function makeReq(method: string, body?: unknown) {
  return new NextRequest("http://localhost/api/analytics/conversion", {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/analytics/conversion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should record conversion event", async () => {
    const mockConversionId = "123e4567-e89b-12d3-a456-426614174000";
    mockRecordConversionEvent.mockResolvedValueOnce(mockConversionId);

    const res = await POST(
      makeReq("POST", {
        userId: "user-123",
        route: "CDG-DKR",
        priceUSD: 1500,
        conversionValue: 10000,
        pricingSource: "DUFFEL",
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.conversionId).toBe(mockConversionId);
    expect(data.route).toBe("CDG-DKR");
    expect(data.priceUSD).toBe(1500);
    expect(data.timestamp).toBeDefined();
    expect(mockRecordConversionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        route: "CDG-DKR",
        priceUSD: 1500,
        conversionValue: 10000,
        pricingSource: "DUFFEL",
      })
    );
  });

  it("should return 400 for missing required fields", async () => {
    const res = await POST(makeReq("POST", { userId: "user-123" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(mockRecordConversionEvent).not.toHaveBeenCalled();
  });

  it("should return 400 for missing route", async () => {
    const res = await POST(
      makeReq("POST", {
        userId: "user-123",
        priceUSD: 1500,
        conversionValue: 10000,
        pricingSource: "DUFFEL",
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(mockRecordConversionEvent).not.toHaveBeenCalled();
  });

  it("should return 400 for missing priceUSD", async () => {
    const res = await POST(
      makeReq("POST", {
        userId: "user-123",
        route: "CDG-DKR",
        conversionValue: 10000,
        pricingSource: "DUFFEL",
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(mockRecordConversionEvent).not.toHaveBeenCalled();
  });

  it("should return 400 for missing conversionValue", async () => {
    const res = await POST(
      makeReq("POST", {
        userId: "user-123",
        route: "CDG-DKR",
        priceUSD: 1500,
        pricingSource: "DUFFEL",
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(mockRecordConversionEvent).not.toHaveBeenCalled();
  });

  it("should validate route format", async () => {
    const res = await POST(
      makeReq("POST", {
        userId: "user-123",
        route: "INVALID",
        priceUSD: 1500,
        conversionValue: 10000,
        pricingSource: "DUFFEL",
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(mockRecordConversionEvent).not.toHaveBeenCalled();
  });

  it("should return 400 for priceUSD <= 0", async () => {
    const res = await POST(
      makeReq("POST", {
        userId: "user-123",
        route: "CDG-DKR",
        priceUSD: 0,
        conversionValue: 10000,
        pricingSource: "DUFFEL",
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(mockRecordConversionEvent).not.toHaveBeenCalled();
  });

  it("should return 400 for conversionValue <= 0", async () => {
    const res = await POST(
      makeReq("POST", {
        userId: "user-123",
        route: "CDG-DKR",
        priceUSD: 1500,
        conversionValue: 0,
        pricingSource: "DUFFEL",
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(mockRecordConversionEvent).not.toHaveBeenCalled();
  });

  it("should accept optional fields", async () => {
    const mockConversionId = "123e4567-e89b-12d3-a456-426614174000";
    mockRecordConversionEvent.mockResolvedValueOnce(mockConversionId);

    const res = await POST(
      makeReq("POST", {
        userId: "user-123",
        route: "CDG-DKR",
        priceUSD: 1500,
        conversionValue: 10000,
        pricingSource: "DUFFEL",
        program: "UNITED_MILEAGE",
        milesBurned: 25000,
        bookingReference: "ABC123",
        source: "organic",
        referrer: "google.com",
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockRecordConversionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        route: "CDG-DKR",
        priceUSD: 1500,
        conversionValue: 10000,
        pricingSource: "DUFFEL",
        program: "UNITED_MILEAGE",
        milesBurned: 25000,
        bookingReference: "ABC123",
        source: "organic",
        referrer: "google.com",
      })
    );
  });
});

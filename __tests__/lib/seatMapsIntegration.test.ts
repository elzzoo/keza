/**
 * Tests for seat map integration
 * Coverage: API querying, caching, unavailable data, batch queries
 */

import {
  querySeatAvailability,
  querySeatAvailabilityBatch,
} from "@/lib/seatMapsIntegration-server";
import type { SeatMapData } from "@/lib/seatMapsIntegration";
import { safeGet, safeSet } from "@/lib/redis";

// Mock Redis cache
jest.mock("@/lib/redis", () => ({
  safeGet: jest.fn(),
  safeSet: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

const mockSafeGet = safeGet as jest.MockedFunction<typeof safeGet>;
const mockSafeSet = safeSet as jest.MockedFunction<typeof safeSet>;
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe("seatMapsIntegration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe("querySeatAvailability", () => {
    it("should return null for unknown airline", async () => {
      mockSafeGet.mockResolvedValue(null);
      mockFetch.mockRejectedValue(new Error("Not found"));

      const result = await querySeatAvailability(
        "UnknownAirline",
        "B787",
        "LAX",
        "JFK",
        "economy",
      );

      expect(result).toBeNull();
    });

    it("should return cached data when available", async () => {
      const mockSeatMapData: SeatMapData = {
        aircraft: "B787",
        airline: "SQ",
        route: { from: "LAX", to: "JFK" },
        cabin: "economy",
        available: 150,
        occupied: 80,
        blocked: 12,
        total: 242,
        percentAvailable: 62,
        status: "good",
        updatedAt: Date.now(),
      };

      mockSafeGet.mockResolvedValue(mockSeatMapData);

      const result = await querySeatAvailability(
        "Singapore Airlines",
        "B787",
        "LAX",
        "JFK",
        "economy",
      );

      expect(result).toEqual(mockSeatMapData);
      expect(mockSafeGet).toHaveBeenCalledWith(
        expect.stringContaining("seatmaps:v1:SQ:B787:LAX:JFK:economy"),
      );
    });

    it("should fetch from SeatGuru API when cache misses", async () => {
      const mockSeatMapData: SeatMapData = {
        aircraft: "B787",
        airline: "SQ",
        route: { from: "LAX", to: "JFK" },
        cabin: "economy",
        available: 150,
        occupied: 80,
        blocked: 12,
        total: 242,
        percentAvailable: 62,
        status: "good",
        updatedAt: Date.now(),
      };

      mockSafeGet.mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          cabins: {
            economy: {
              seats: {
                available: 150,
                occupied: 80,
                blocked: 12,
              },
            },
          },
        }),
      } as Response);

      const result = await querySeatAvailability(
        "Singapore Airlines",
        "B787",
        "LAX",
        "JFK",
        "economy",
      );

      expect(result).not.toBeNull();
      expect(result?.available).toBe(150);
      expect(mockSafeSet).toHaveBeenCalled();
    });

    it("should return no data when both APIs fail", async () => {
      mockSafeGet.mockResolvedValue(null);
      mockFetch.mockRejectedValue(new Error("API unavailable"));

      const result = await querySeatAvailability(
        "Singapore Airlines",
        "B787",
        "LAX",
        "JFK",
        "economy",
      );

      expect(result).toBeNull();
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockSafeSet).not.toHaveBeenCalled();
    });

    it("ignores a legacy estimated cache entry and replaces it with supplier data", async () => {
      mockSafeGet.mockResolvedValue({
        aircraft: "B787", airline: "SQ", route: { from: "LAX", to: "JFK" }, cabin: "economy",
        available: 150, occupied: 80, blocked: 12, total: 242,
        percentAvailable: 62, status: "good", updatedAt: Date.now(), isFallback: true,
      } as SeatMapData);
      mockFetch.mockResolvedValue({
        ok: true, status: 200,
        json: async () => ({ cabins: { economy: { seats: { available: 4, occupied: 6, blocked: 0 } } } }),
      } as Response);

      const result = await querySeatAvailability("SQ", "B787", "LAX", "JFK", "economy");

      expect(result?.available).toBe(4);
      expect(result?.isFallback).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockSafeSet).toHaveBeenCalledTimes(1);
    });
  });

  describe("Airline code normalization", () => {
    it("should handle 2-letter IATA codes directly", async () => {
      mockSafeGet.mockResolvedValue(null);
      mockFetch.mockRejectedValue(new Error("Not found"));

      const result = await querySeatAvailability(
        "SQ",
        "B787",
        "LAX",
        "JFK",
        "economy",
      );

      expect(result).toBeNull();
      expect(mockSafeGet).toHaveBeenCalledWith(expect.stringContaining("seatmaps:v1:SQ:B787"));
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/airline/SQ/aircraft/B787"), expect.any(Object));
    });

    it("should map common airline names to IATA codes", async () => {
      const airlineNames = [
        { name: "Singapore Airlines", code: "SQ" },
        { name: "Emirates", code: "EK" },
        { name: "Qatar Airways", code: "QR" },
        { name: "Cathay Pacific", code: "CX" },
      ];

      mockSafeGet.mockResolvedValue(null);
      mockFetch.mockRejectedValue(new Error("Not found"));

      for (const { name, code } of airlineNames) {
        const result = await querySeatAvailability(
          name,
          "B787",
          "LAX",
          "JFK",
          "economy",
        );

        expect(result).toBeNull();
        expect(mockSafeGet).toHaveBeenCalledWith(expect.stringContaining(`seatmaps:v1:${code}:B787`));
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining(`/airline/${code}/aircraft/B787`), expect.any(Object));
      }
    });
  });

  describe("Seat availability status", () => {
    it("should mark status as good when > 50% available", async () => {
      mockSafeGet.mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          cabins: {
            economy: {
              seats: {
                available: 150,
                occupied: 80,
                blocked: 12,
              },
            },
          },
        }),
      } as Response);

      const result = await querySeatAvailability(
        "Singapore Airlines",
        "B787",
        "LAX",
        "JFK",
        "economy",
      );

      expect(result?.status).toBe("good");
    });

    it("should mark status as warning when 20-50% available", async () => {
      mockSafeGet.mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          cabins: {
            economy: {
              seats: {
                available: 60,
                occupied: 170,
                blocked: 12,
              },
            },
          },
        }),
      } as Response);

      const result = await querySeatAvailability(
        "Singapore Airlines",
        "B787",
        "LAX",
        "JFK",
        "economy",
      );

      expect(result?.status).toBe("warning");
    });

    it("should mark status as critical when < 20% available", async () => {
      mockSafeGet.mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          cabins: {
            economy: {
              seats: {
                available: 30,
                occupied: 200,
                blocked: 12,
              },
            },
          },
        }),
      } as Response);

      const result = await querySeatAvailability(
        "Singapore Airlines",
        "B787",
        "LAX",
        "JFK",
        "economy",
      );

      expect(result?.status).toBe("critical");
    });
  });

  describe("querySeatAvailabilityBatch", () => {
    it("should omit unavailable flights from the batch", async () => {
      mockSafeGet.mockResolvedValue(null);
      mockFetch.mockRejectedValue(new Error("Not found"));

      const flights = [
        {
          airline: "Singapore Airlines",
          aircraft: "B787",
          from: "LAX",
          to: "JFK",
          cabin: "economy" as const,
        },
        {
          airline: "Emirates",
          aircraft: "A350",
          from: "DXB",
          to: "LHR",
          cabin: "business" as const,
        },
      ];

      const results = await querySeatAvailabilityBatch(flights);

      expect(results.size).toBe(0);
      expect(mockSafeSet).not.toHaveBeenCalled();
    });

    it("should handle multiple successful queries", async () => {
      mockSafeGet.mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          cabins: {
            economy: {
              seats: {
                available: 150,
                occupied: 80,
                blocked: 12,
              },
            },
            business: {
              seats: {
                available: 8,
                occupied: 12,
                blocked: 0,
              },
            },
          },
        }),
      } as Response);

      const flights = [
        {
          airline: "Singapore Airlines",
          aircraft: "B787",
          from: "LAX",
          to: "JFK",
          cabin: "economy" as const,
        },
        {
          airline: "Emirates",
          aircraft: "A350",
          from: "LAX",
          to: "ORD",
          cabin: "business" as const,
        },
      ];

      const results = await querySeatAvailabilityBatch(flights);

      expect(results.size).toBeGreaterThan(0);
    });
  });

  describe("Edge cases", () => {
    it("should handle API errors without crashing", async () => {
      mockSafeGet.mockResolvedValue(null);
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await querySeatAvailability(
        "Singapore Airlines",
        "B787",
        "LAX",
        "JFK",
        "economy",
      );

      expect(result).toBeNull();
      expect(mockSafeSet).not.toHaveBeenCalled();
    });

    it("should handle malformed API responses", async () => {
      mockSafeGet.mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}), // Empty response
      } as Response);

      const result = await querySeatAvailability(
        "Singapore Airlines",
        "B787",
        "LAX",
        "JFK",
        "economy",
      );

      expect(result).toBeNull();
      expect(mockSafeSet).not.toHaveBeenCalled();
    });

    it("should mark critical status for very low availability", async () => {
      mockSafeGet.mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          cabins: {
            economy: {
              seats: {
                available: 1,
                occupied: 240,
                blocked: 1,
              },
            },
          },
        }),
      } as Response);

      const result = await querySeatAvailability(
        "Singapore Airlines",
        "B787",
        "LAX",
        "JFK",
        "economy",
      );

      expect(result).not.toBeNull();
      expect(result?.status).toBe("critical");
      expect(result?.percentAvailable).toBeLessThan(1);
    });
  });

  describe("supplier fallback without invented availability", () => {
    it("uses SeatMaps data when SeatGuru has no matching aircraft", async () => {
      mockSafeGet.mockResolvedValue(null);
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 404 } as Response)
        .mockResolvedValueOnce({
          ok: true, status: 200,
          json: async () => ({ layout: { cabins: { economy: { available: 8, occupied: 12, blocked: 0 } } } }),
        } as Response);

      const result = await querySeatAvailability(
        "Singapore Airlines",
        "B787",
        "LAX",
        "JFK",
        "economy",
      );

      expect(result).toMatchObject({ available: 8, occupied: 12, total: 20, percentAvailable: 40 });
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockSafeSet).toHaveBeenCalledTimes(1);
    });

    it("does not invent a seat count for an unknown aircraft", async () => {
      mockSafeGet.mockResolvedValue(null);
      mockFetch.mockRejectedValue(new Error("API unavailable"));

      const result = await querySeatAvailability(
        "Singapore Airlines",
        "UnknownAircraft",
        "LAX",
        "JFK",
        "economy",
      );

      expect(result).toBeNull();
      expect(mockSafeSet).not.toHaveBeenCalled();
    });
  });
});

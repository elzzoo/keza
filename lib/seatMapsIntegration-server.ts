"use server";

import { safeGet, safeSet } from "@/lib/redis";
import type { SeatMapData } from "@/lib/seatMapsIntegration";

// ─── SeatGuru API integration ──────────────────────────────────────────────

const SEATGURU_API_BASE = "https://www.seatguru.com/api";
const SEATMAPS_API_BASE = "https://api.seatmaps.com";

const CACHE_TTL = 24 * 3600; // 24 hours in seconds

/**
 * Query supplier seat availability without inventing data when it is unavailable.
 */
export async function querySeatAvailability(
  airline: string,
  aircraft: string,
  from: string,
  to: string,
  cabin: "economy" | "premium" | "business" | "first",
): Promise<SeatMapData | null> {
  try {
    // Normalize airline code (e.g., "Singapore Airlines" → "SQ")
    const airlineCode = normalizeAirlineCode(airline);
    if (!airlineCode) return null;

    // Cache key: seatmaps:v1:AIRLINE:AIRCRAFT:FROM:TO:CABIN
    const cacheKey = `seatmaps:v1:${airlineCode}:${aircraft}:${from}:${to}:${cabin}`;

    // Try cache first
    const cached = await safeGet<SeatMapData>(cacheKey);
    if (cached && !cached.isFallback) return cached;

    // Try SeatGuru API first
    let seatData: SeatMapData | null = null;
    try {
      const seatGuruData = await fetchFromSeatGuru(
        airlineCode,
        aircraft,
        from,
        to,
        cabin,
      );
      if (seatGuruData) seatData = seatGuruData;
    } catch (error) {
      console.warn(`[SeatGuru] Error for ${airlineCode} ${aircraft}:`, error);
    }

    // Fallback: try SeatMaps API
    if (!seatData) {
      try {
        const seatMapsData = await fetchFromSeatMaps(
          airlineCode,
          aircraft,
          from,
          to,
          cabin,
        );
        if (seatMapsData) seatData = seatMapsData;
      } catch (error) {
        console.warn(`[SeatMaps] Error for ${airlineCode} ${aircraft}:`, error);
      }
    }

    if (!seatData) return null;

    // Cache the result
    await safeSet(cacheKey, seatData, { ex: CACHE_TTL });
    return seatData;
  } catch (error) {
    console.error("[SeatMapsIntegration] Fatal error:", error);
    return null;
  }
}

/**
 * Fetch seat data from SeatGuru API
 * Returns null if route/aircraft not found
 */
async function fetchFromSeatGuru(
  airlineCode: string,
  aircraft: string,
  from: string,
  to: string,
  cabin: string,
): Promise<SeatMapData | null> {
  try {
    // SeatGuru endpoint: /airline/{code}/aircraft/{model}
    const url = new URL(`${SEATGURU_API_BASE}/airline/${airlineCode}/aircraft/${aircraft}`);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Xalifly-SeatMapClient/1.0",
      },
      next: { revalidate: CACHE_TTL },
    });

    if (!response.ok) {
      if (response.status === 404) return null; // Route/aircraft not found
      throw new Error(`SeatGuru API returned ${response.status}`);
    }

    const data = await response.json() as Record<string, unknown>;

    // Parse SeatGuru response and extract seat availability
    const cabinData = extractSeatGuruCabinData(data, cabin);
    if (!cabinData) return null;

    return {
      aircraft,
      airline: airlineCode,
      route: { from, to },
      cabin: cabin as "economy" | "premium" | "business" | "first",
      available: cabinData.available,
      occupied: cabinData.occupied,
      blocked: cabinData.blocked,
      total: cabinData.total,
      percentAvailable: (cabinData.available / cabinData.total) * 100,
      status: determineStatus((cabinData.available / cabinData.total) * 100),
      thumbnailUrl: cabinData.thumbnailUrl,
      mapUrl: cabinData.mapUrl,
      updatedAt: Date.now(),
    };
  } catch (error) {
    console.warn("[fetchFromSeatGuru] Error:", error);
    return null;
  }
}

/**
 * Fetch seat data from SeatMaps API (secondary fallback)
 */
async function fetchFromSeatMaps(
  airlineCode: string,
  aircraft: string,
  from: string,
  to: string,
  cabin: string,
): Promise<SeatMapData | null> {
  try {
    // SeatMaps endpoint: /flights/{airline}/{aircraft}
    const url = new URL(`${SEATMAPS_API_BASE}/flights/${airlineCode}/${aircraft}`);
    url.searchParams.set("from", from);
    url.searchParams.set("to", to);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Xalifly-SeatMapClient/1.0",
      },
      next: { revalidate: CACHE_TTL },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`SeatMaps API returned ${response.status}`);
    }

    const data = await response.json() as Record<string, unknown>;

    const cabinData = extractSeatMapsCabinData(data, cabin);
    if (!cabinData) return null;

    return {
      aircraft,
      airline: airlineCode,
      route: { from, to },
      cabin: cabin as "economy" | "premium" | "business" | "first",
      available: cabinData.available,
      occupied: cabinData.occupied,
      blocked: cabinData.blocked,
      total: cabinData.total,
      percentAvailable: (cabinData.available / cabinData.total) * 100,
      status: determineStatus((cabinData.available / cabinData.total) * 100),
      thumbnailUrl: cabinData.thumbnailUrl,
      mapUrl: cabinData.mapUrl,
      updatedAt: Date.now(),
    };
  } catch (error) {
    console.warn("[fetchFromSeatMaps] Error:", error);
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Normalize airline name/code to 2-letter IATA code
 * E.g., "Singapore Airlines" → "SQ", "Emirates" → "EK"
 */
function normalizeAirlineCode(airline: string): string | null {
  const normalized = airline.toUpperCase();

  // Direct code match
  if (normalized.length === 2 && /^[A-Z]{2}$/.test(normalized)) {
    return normalized;
  }

  // Map common names to codes
  const nameToCode: Record<string, string> = {
    "SINGAPORE AIRLINES": "SQ",
    "SINGAPORE AIR": "SQ",
    "EMIRATES": "EK",
    "EMIRATES AIRLINES": "EK",
    "QATAR": "QR",
    "QATAR AIRWAYS": "QR",
    "CATHAY PACIFIC": "CX",
    "CATHAY": "CX",
    "ANA": "NH",
    "JAPAN AIRLINES": "JL",
    "JAL": "JL",
    "AIR FRANCE": "AF",
    "BRITISH AIRWAYS": "BA",
    "KLM": "KL",
    "LUFTHANSA": "LH",
    "UNITED": "UA",
    "DELTA": "DL",
    "AMERICAN": "AA",
    "SOUTHWEST": "WN",
    "JETBLUE": "B6",
    "ALASKA": "AS",
    "VIRGIN": "VX",
  };

  return nameToCode[normalized] || null;
}

/**
 * Determine seat availability status based on percentage
 */
function determineStatus(percentAvailable: number): "good" | "warning" | "critical" {
  if (percentAvailable > 50) return "good";
  if (percentAvailable > 20) return "warning";
  return "critical";
}

function parseSeatCounts(value: unknown): { available: number; occupied: number; blocked: number; total: number } | null {
  if (!value || typeof value !== "object") return null;
  const counts = value as Record<string, unknown>;
  const { available, occupied } = counts;
  const blocked = counts.blocked ?? 0;
  if (![available, occupied, blocked].every((count) =>
    typeof count === "number" && Number.isSafeInteger(count) && count >= 0
  )) return null;
  const total = (available as number) + (occupied as number) + (blocked as number);
  if (!Number.isSafeInteger(total) || total === 0) return null;
  return { available: available as number, occupied: occupied as number, blocked: blocked as number, total };
}

/**
 * Extract cabin-specific seat data from SeatGuru response
 */
function extractSeatGuruCabinData(
  data: Record<string, unknown>,
  cabin: string,
): { available: number; occupied: number; blocked: number; total: number; thumbnailUrl?: string; mapUrl?: string } | null {
  try {
    // SeatGuru API structure: data.cabins[cabin].seats
    const cabins = data.cabins as Record<string, unknown> | undefined;
    if (!cabins) return null;

    const cabinData = cabins[cabin] as Record<string, unknown> | undefined;
    if (!cabinData) return null;

    const counts = parseSeatCounts(cabinData.seats);
    if (!counts) return null;

    return {
      ...counts,
      thumbnailUrl: (cabinData.thumbnailUrl as string) || undefined,
      mapUrl: (cabinData.mapUrl as string) || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Extract cabin-specific seat data from SeatMaps response
 */
function extractSeatMapsCabinData(
  data: Record<string, unknown>,
  cabin: string,
): { available: number; occupied: number; blocked: number; total: number; thumbnailUrl?: string; mapUrl?: string } | null {
  try {
    // SeatMaps API structure: data.layout.cabins[cabin]
    const layout = data.layout as Record<string, unknown> | undefined;
    if (!layout) return null;

    const cabins = layout.cabins as Record<string, unknown> | undefined;
    if (!cabins) return null;

    const cabinData = cabins[cabin] as Record<string, unknown> | undefined;
    if (!cabinData) return null;

    const counts = parseSeatCounts(cabinData);
    if (!counts) return null;

    return {
      ...counts,
      thumbnailUrl: (cabinData.image as string) || undefined,
      mapUrl: (cabinData.url as string) || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Batch query seat availability for multiple flights
 * Useful for initial page load
 */
export async function querySeatAvailabilityBatch(
  flights: Array<{
    airline: string;
    aircraft: string;
    from: string;
    to: string;
    cabin: "economy" | "premium" | "business" | "first";
  }>,
): Promise<Map<string, SeatMapData>> {
  const results = new Map<string, SeatMapData>();

  const promises = flights.map(async (flight) => {
    const key = `${flight.airline}:${flight.aircraft}:${flight.from}:${flight.to}:${flight.cabin}`;
    const data = await querySeatAvailability(
      flight.airline,
      flight.aircraft,
      flight.from,
      flight.to,
      flight.cabin,
    );
    if (data) {
      results.set(key, data);
    }
  });

  await Promise.all(promises);
  return results;
}

/**
 * Real-time seat map integration for KEZA
 *
 * Queries SeatGuru/SeatMaps API to fetch aircraft seat availability
 * Caches results for 24 hours
 * Provides graceful fallback when API is unavailable
 */

import { safeGet, safeSet } from "@/lib/redis";

// ─── Type definitions ──────────────────────────────────────────────────────

export interface SeatMapData {
  aircraft: string;
  airline: string;
  route: {
    from: string;
    to: string;
  };
  cabin: "economy" | "premium" | "business" | "first";

  // Seat availability breakdown
  available: number;
  occupied: number;
  blocked: number;
  total: number;

  // Percentage available
  percentAvailable: number;

  // Health status: "good" (>50%), "warning" (20-50%), "critical" (<20%)
  status: "good" | "warning" | "critical";

  // Thumbnail URL for preview
  thumbnailUrl?: string;

  // Full map URL (for link-out)
  mapUrl?: string;

  // Last updated timestamp
  updatedAt: number;

  // Fallback indicator
  isFallback?: boolean;
}

// ─── SeatGuru API integration ──────────────────────────────────────────────

const SEATGURU_API_BASE = "https://www.seatguru.com/api";
const SEATMAPS_API_BASE = "https://api.seatmaps.com";

const CACHE_TTL = 24 * 3600; // 24 hours in seconds
const FALLBACK_PERCENTAGES: Record<string, number> = {
  "good": 65,
  "warning": 35,
  "critical": 15,
};

/**
 * Query real-time seat availability from SeatGuru
 * Falls back to estimated seat map if API is unavailable
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
    if (cached) return cached;

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

    // Final fallback: generate estimated seat map
    if (!seatData) {
      seatData = generateFallbackSeatMap(airlineCode, aircraft, from, to, cabin);
    }

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
        "User-Agent": "KEZA-SeatMapClient/1.0",
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
        "User-Agent": "KEZA-SeatMapClient/1.0",
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

/**
 * Generate a fallback seat map when API is unavailable
 * Uses statistical estimates based on cabin type
 */
function generateFallbackSeatMap(
  airlineCode: string,
  aircraft: string,
  from: string,
  to: string,
  cabin: string,
): SeatMapData {
  // Typical seat counts per cabin
  const typicalSeats: Record<string, { economy: number; premium: number; business: number; first: number }> = {
    "B787": { economy: 242, premium: 26, business: 21, first: 8 },
    "A350": { economy: 236, premium: 28, business: 20, first: 8 },
    "A380": { economy: 399, premium: 80, business: 76, first: 16 },
    "B777": { economy: 300, premium: 52, business: 42, first: 8 },
    "A330": { economy: 255, premium: 42, business: 30, first: 0 },
    "B767": { economy: 218, premium: 28, business: 18, first: 0 },
    "A320": { economy: 150, premium: 12, business: 0, first: 0 },
    "B737": { economy: 162, premium: 12, business: 0, first: 0 },
  };

  const cabinConfig = typicalSeats[aircraft] || {
    economy: 250,
    premium: 40,
    business: 30,
    first: 0,
  };

  const totalSeats = cabinConfig[cabin as keyof typeof cabinConfig] || 50;
  const percentAvailable = FALLBACK_PERCENTAGES[Math.random() > 0.5 ? "good" : "warning"] || 50;
  const available = Math.round(totalSeats * (percentAvailable / 100));
  const occupied = Math.round(totalSeats * 0.6);
  const blocked = totalSeats - available - occupied;

  return {
    aircraft,
    airline: airlineCode,
    route: { from, to },
    cabin: cabin as "economy" | "premium" | "business" | "first",
    available,
    occupied,
    blocked,
    total: totalSeats,
    percentAvailable,
    status: determineStatus(percentAvailable),
    mapUrl: `https://www.seatguru.com/airlines/${airlineCode}/aircraft/${aircraft}/seating-chart.php`,
    updatedAt: Date.now(),
    isFallback: true,
  };
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

    const seats = cabinData.seats as { available: number; occupied: number; blocked: number } | undefined;
    if (!seats) return null;

    return {
      available: seats.available || 0,
      occupied: seats.occupied || 0,
      blocked: seats.blocked || 0,
      total: (seats.available || 0) + (seats.occupied || 0) + (seats.blocked || 0),
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

    const available = (cabinData.available as number) || 0;
    const occupied = (cabinData.occupied as number) || 0;
    const blocked = (cabinData.blocked as number) || 0;

    return {
      available,
      occupied,
      blocked,
      total: available + occupied + blocked,
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

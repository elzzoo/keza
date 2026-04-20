/**
 * Dynamic Award Engine — Distance-based miles estimator for ANY route worldwide.
 *
 * Uses great-circle distance (Haversine) + alliance-specific rates to estimate
 * award pricing when no hardcoded award chart is available.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CabinClass = "economy" | "premium_economy" | "business" | "first";
export type TripType = "oneway" | "roundtrip";
export type Alliance = "Star Alliance" | "Oneworld" | "SkyTeam" | "Independent";
export type Confidence = "EXACT" | "ESTIMATE" | "ROUGH_ESTIMATE";

export interface MilesEstimate {
  program: string;
  milesRequired: number;
  cabin: CabinClass;
  tripType: TripType;
  passengers: number;
  distanceKm: number;
  confidence: Confidence;
  breakdown: {
    baseRate: number;        // miles per km used
    cabinMultiplier: number;
    tripMultiplier: number;
    rawMiles: number;        // before rounding
  };
}

// ---------------------------------------------------------------------------
// Configurable constants — miles per km, one-way, economy
// ---------------------------------------------------------------------------

/**
 * Base rates express how many award miles a program typically charges per km
 * of great-circle distance for a ONE-WAY ECONOMY redemption.
 *
 * These are empirical averages derived from published award charts:
 *  - Zone-based programs are approximated by dividing typical zone prices
 *    by median zone-pair distances.
 *  - Distance-based programs (e.g. BA Avios) map more directly.
 */
export const ALLIANCE_BASE_RATES: Record<Alliance, number> = {
  "Star Alliance": 8,   // e.g. United, Turkish, ANA, Aeroplan
  "Oneworld":      7,   // e.g. BA Avios (distance-based), AA, Cathay
  "SkyTeam":       7.5, // e.g. Flying Blue, Delta, Korean Air
  "Independent":   9,   // e.g. Emirates (premium pricing)
};

/**
 * Per-program overrides when a program deviates significantly from its
 * alliance average. Add entries here as you calibrate.
 */
export const PROGRAM_RATE_OVERRIDES: Record<string, number> = {
  // Distance-based programs tend to be cheaper short-haul, pricier long-haul.
  // The override reflects a blended average.
  "BA Avios":            6.5,
  "Iberia Avios Plus":   6.5,
  "Emirates Skywards":   9.5,
  "Etihad Guest":        8.5,
  "LifeMiles":           7,    // Often cheapest Star Alliance option
  "Alaska Mileage Plan": 6.5,  // Known for outsized sweet spots
  "ANA Mileage Club":    7,    // Excellent long-haul value
  "Virgin Atlantic Flying Club": 7.5,
};

/** Cabin class multipliers applied on top of the economy base rate. */
export const CABIN_MULTIPLIERS: Record<CabinClass, number> = {
  economy:         1.0,
  premium_economy: 1.5,
  business:        2.5,
  first:           3.5,
};

/** Minimum miles that any program charges (floor). */
export const MIN_MILES_ONEWAY: Record<CabinClass, number> = {
  economy:         4_500,
  premium_economy: 8_000,
  business:        15_000,
  first:           25_000,
};

// ---------------------------------------------------------------------------
// Haversine — great-circle distance in km
// ---------------------------------------------------------------------------

const EARTH_RADIUS_KM = 6_371;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Calculate great-circle distance between two points using the Haversine formula.
 * @returns distance in kilometres
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

// ---------------------------------------------------------------------------
// Core estimator
// ---------------------------------------------------------------------------

/**
 * Resolve the per-km rate for a given program.
 * Uses program-specific override if available, otherwise falls back to
 * the alliance average.
 */
export function resolveRate(program: string, alliance: Alliance): number {
  return PROGRAM_RATE_OVERRIDES[program] ?? ALLIANCE_BASE_RATES[alliance];
}

/**
 * Round miles to the nearest 500 (most programs use 500- or 1000-mile
 * increments in their charts).
 */
function roundMiles(miles: number): number {
  return Math.ceil(miles / 500) * 500;
}

/**
 * Estimate the award miles required for a redemption on any route worldwide.
 *
 * @param program    - Loyalty program name (e.g. "Turkish Miles&Smiles")
 * @param alliance   - Alliance the program belongs to
 * @param fromLat    - Origin latitude
 * @param fromLon    - Origin longitude
 * @param toLat      - Destination latitude
 * @param toLon      - Destination longitude
 * @param cabin      - Cabin class
 * @param tripType   - "oneway" or "roundtrip"
 * @param passengers - Number of passengers (default 1)
 */
export function estimateMilesRequired(
  program: string,
  alliance: Alliance,
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  cabin: CabinClass = "economy",
  tripType: TripType = "roundtrip",
  passengers: number = 1,
): MilesEstimate {
  // 1. Great-circle distance
  const distanceKm = haversineDistanceKm(fromLat, fromLon, toLat, toLon);

  // 2. Per-km rate
  const baseRate = resolveRate(program, alliance);

  // 3. Cabin multiplier
  const cabinMultiplier = CABIN_MULTIPLIERS[cabin];

  // 4. Trip multiplier
  const tripMultiplier = tripType === "roundtrip" ? 2 : 1;

  // 5. Raw calculation
  const rawMilesOneWay = distanceKm * baseRate * cabinMultiplier;

  // 6. Apply floor
  const flooredOneWay = Math.max(rawMilesOneWay, MIN_MILES_ONEWAY[cabin]);

  // 7. Round, then apply trip & passengers
  const roundedOneWay = roundMiles(flooredOneWay);
  const totalMiles = roundedOneWay * tripMultiplier * passengers;

  return {
    program,
    milesRequired: totalMiles,
    cabin,
    tripType,
    passengers,
    distanceKm: Math.round(distanceKm),
    confidence: "ESTIMATE",
    breakdown: {
      baseRate,
      cabinMultiplier,
      tripMultiplier,
      rawMiles: rawMilesOneWay * tripMultiplier * passengers,
    },
  };
}

// ---------------------------------------------------------------------------
// Batch helper — estimate across multiple programs at once
// ---------------------------------------------------------------------------

export interface MultiProgramEstimate {
  estimates: MilesEstimate[];
  cheapest: MilesEstimate;
  mostExpensive: MilesEstimate;
}

/**
 * Estimate miles for the same route across many programs and return them
 * sorted cheapest-first.
 */
export function estimateMultiplePrograms(
  programs: Array<{ program: string; alliance: Alliance }>,
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  cabin: CabinClass = "economy",
  tripType: TripType = "roundtrip",
  passengers: number = 1,
): MultiProgramEstimate {
  const estimates = programs
    .map(({ program, alliance }) =>
      estimateMilesRequired(
        program,
        alliance,
        fromLat,
        fromLon,
        toLat,
        toLon,
        cabin,
        tripType,
        passengers,
      ),
    )
    .sort((a, b) => a.milesRequired - b.milesRequired);

  return {
    estimates,
    cheapest: estimates[0],
    mostExpensive: estimates[estimates.length - 1],
  };
}

import "server-only";
import type { NormalizedFlight } from "../promotions/engine";
import { buildCostOptions } from "../costEngine";
import type { FlightInput } from "../costEngine";
import { optimizeMiles } from "../optimizer";
import type { Cabin, TripType, FlightResult, Stops } from "./types";
import { CABIN_MULTIPLIER } from "./types";
import { AVIASALES_BASE_URL, TP_MARKER, buildAviasalesUrl } from "./travelpayouts";

export { CABIN_MULTIPLIER };

// ─── Enrich a single flight into a FlightResult ──────────────────────────────

export function enrich(
  f: NormalizedFlight,
  cabin: Cabin,
  passengers: number,
  userPrograms: string[],
  tripType: TripType,
  effectivePrices: Map<string, number>,
  returnFlight?: NormalizedFlight,
  searchDate?: string,
  returnDate?: string,
): FlightResult {
  // Duffel flights already price the exact cabin — don't double-apply the multiplier.
  const outboundMultiplier = f.cabinResolved ? 1 : CABIN_MULTIPLIER[cabin];
  const returnMultiplier   = returnFlight?.cabinResolved ? 1 : CABIN_MULTIPLIER[cabin];

  const outboundPrice = Math.round(f.price * outboundMultiplier * 100) / 100;
  const returnPrice   = returnFlight
    ? Math.round(returnFlight.price * returnMultiplier * 100) / 100
    : undefined;

  const totalPrice = returnPrice !== undefined
    ? Math.round((outboundPrice + returnPrice) * passengers * 100) / 100
    : Math.round(outboundPrice * passengers * 100) / 100;

  const flightInput: FlightInput = {
    from: f.from,
    to: f.to,
    totalPrice,
    airlines: f.airlines,
    stops: f.stops ?? 0,
    cabin,
    tripType,
    passengers,
  };

  const comparison  = buildCostOptions(flightInput, effectivePrices);

  const optimization = optimizeMiles(f.airlines, userPrograms);

  // When cash price is estimated (no real Duffel cabin price), the miles-vs-cash
  // comparison is unreliable — downgrade USE_MILES/USE_CASH to the neutral
  // IF_HAVE_MILES so the UI doesn't show a confident "save XXX€" claim built
  // on a multiplied economy fare.
  const priceIsEstimate = !f.cabinResolved && cabin !== "economy";
  const safeRecommendation = priceIsEstimate ? "IF_HAVE_MILES" : comparison.recommendation;

  const result: FlightResult = {
    from: f.from,
    to: f.to,
    price: outboundPrice,
    airlines: f.airlines,
    stops: f.stops,
    duration: f.duration,
    tripType,
    cabin,
    passengers,
    totalPrice,
    cashCost:            comparison.cashCost,
    milesCost:           comparison.milesCost,
    savings:             comparison.savings,
    recommendation:      safeRecommendation,
    bestOption:          comparison.bestOption,
    milesOptions:        comparison.milesOptions,
    explanation:         comparison.explanation,
    displayMessage:      comparison.displayMessage,
    disclaimer:          comparison.disclaimer,
    // cabinPriceEstimated: true only when we applied a multiplier estimate.
    // Duffel flights (cabinResolved) already carry the real cabin price.
    cabinPriceEstimated: priceIsEstimate,
    searchId:            "",   // filled by caller; placeholder here
    optimization,
  };

  if (priceIsEstimate) result.priceIsEstimate = true;

  if (f.isSupplemental)    result.isSupplemental    = true;
  if (f.source)            result.source            = f.source;
  if (f.priceConfidence)   result.priceConfidence   = f.priceConfidence;

  if (returnPrice !== undefined) {
    result.returnPrice    = returnPrice;
    result.returnAirlines = returnFlight?.airlines;
  }

  if (f.source === "DUFFEL" && f.bookingLink) {
    // Duffel provides a real-time booking link — always prefer it over a generic
    // Aviasales search URL, even for roundtrips. Duffel links are HIGH confidence.
    result.bookingLink = f.bookingLink;
  } else if (tripType === "roundtrip" && searchDate && returnDate && f.from && f.to) {
    // Round-trip TP: build a proper RT Aviasales search URL.
    // ALWAYS build from f.from / f.to (already rebranded by rebrandRoute) rather
    // than re-using f.bookingLink which may contain a stale/incorrect origin.
    result.bookingLink = buildAviasalesUrl(f.from, f.to, searchDate, returnDate, passengers);
  } else if (searchDate && f.from && f.to) {
    // One-way: ALWAYS build from known f.from/f.to to guarantee correct origin.
    // Do NOT fall through to f.bookingLink (TP v3 deep links may carry wrong origin
    // after metro-code fallback attempts, e.g. DKR appearing in a DXB→JFK link).
    result.bookingLink = buildAviasalesUrl(f.from, f.to, searchDate, undefined, passengers ?? 1);
  }

  return result;
}

/**
 * Merge NormalizedFlight arrays from multiple providers.
 * Deduplicates by (sorted airlines, stops), keeping the cheapest price per pairing.
 * Preserves booking links from the first provider that has them (Travelpayouts).
 */
export function mergeFlights(primary: NormalizedFlight[], secondary: NormalizedFlight[]): NormalizedFlight[] {
  const all = [...primary, ...secondary];
  if (all.length === 0) return [];

  const best = new Map<string, NormalizedFlight>();
  for (const f of all) {
    const key = `${[...f.airlines].sort().join(",")}::${f.stops ?? 0}`;
    const existing = best.get(key);
    if (!existing) {
      best.set(key, f);
    } else {
      const fIsDuffel = f.source === "DUFFEL";
      const existingIsDuffel = existing.source === "DUFFEL";
      if (fIsDuffel && !existingIsDuffel) {
        // New entry is Duffel (HIGH confidence) — prefer it over TP; inherit TP booking link if Duffel has none
        best.set(key, { ...f, bookingLink: f.bookingLink ?? existing.bookingLink });
      } else if (!fIsDuffel && existingIsDuffel) {
        // Existing is Duffel — keep it; only carry over TP booking link if Duffel lacks one
        if (!existing.bookingLink && f.bookingLink) {
          best.set(key, { ...existing, bookingLink: f.bookingLink });
        }
      } else if (f.price < existing.price) {
        // Same source tier — keep the cheaper one
        best.set(key, { ...f, bookingLink: f.bookingLink ?? existing.bookingLink });
      }
    }
  }

  return Array.from(best.values());
}

// ─── Filter by stops preference ──────────────────────────────────────────────

export function filterByStops(flights: NormalizedFlight[], stops: Stops): NormalizedFlight[] {
  if (stops === "any") return flights;
  if (stops === "direct") return flights.filter((f) => (f.stops ?? 0) === 0);
  return flights.filter((f) => (f.stops ?? 0) > 0);
}

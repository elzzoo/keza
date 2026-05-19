import "server-only";
import type { NormalizedFlight } from "../promotions/engine";
import { iataToAirline } from "../iataAirlines";
import { TP_BASE, AVIASALES_BASE_URL, TP_MARKER } from "./travelpayouts";
import type { Cabin, TripType, FlightResult } from "./types";
import { CABIN_MULTIPLIER } from "./types";

// ─── Home Carrier Guarantee ──────────────────────────────────────────────────
// Last-resort guarantee: after all providers are processed, if NONE of the
// listed programs appear in ANY result's milesOptions, the engine injects a
// synthetic entry for the home airline so the miles calculation still runs.
//
// Fixes B2/B3/B4: Duffel test data is randomized — SQ/NH/JL/EK may or may not
// appear in any given request. This map ensures their programs are ALWAYS present
// on the corridors where they dominate, regardless of provider data quality.
//
// Key format: "ORIGIN-DEST" (uppercase). Both directions listed.
// airline: exact name in iataAirlines.ts. programs: program names to check.
export const HOME_CARRIER_PROGRAMS: Record<string, { airline: string; programs: string[] }[]> = {
  // Singapore Airlines — KrisFlyer (SIN hub)
  "SIN-LAX": [{ airline: "Singapore Airlines", programs: ["Singapore KrisFlyer"] }],
  "LAX-SIN": [{ airline: "Singapore Airlines", programs: ["Singapore KrisFlyer"] }],
  "SIN-JFK": [{ airline: "Singapore Airlines", programs: ["Singapore KrisFlyer"] }],
  "JFK-SIN": [{ airline: "Singapore Airlines", programs: ["Singapore KrisFlyer"] }],
  "SIN-SFO": [{ airline: "Singapore Airlines", programs: ["Singapore KrisFlyer"] }],
  "SFO-SIN": [{ airline: "Singapore Airlines", programs: ["Singapore KrisFlyer"] }],
  "SIN-LHR": [{ airline: "Singapore Airlines", programs: ["Singapore KrisFlyer"] }],
  "LHR-SIN": [{ airline: "Singapore Airlines", programs: ["Singapore KrisFlyer"] }],

  // ANA + JAL — NRT/HND hub outbound
  "NRT-LAX": [{ airline: "All Nippon Airways", programs: ["ANA Mileage Club"] }, { airline: "Japan Airlines", programs: ["Japan Airlines Mileage Bank"] }],
  "LAX-NRT": [{ airline: "All Nippon Airways", programs: ["ANA Mileage Club"] }, { airline: "Japan Airlines", programs: ["Japan Airlines Mileage Bank"] }],
  "HND-LAX": [{ airline: "All Nippon Airways", programs: ["ANA Mileage Club"] }, { airline: "Japan Airlines", programs: ["Japan Airlines Mileage Bank"] }],
  "LAX-HND": [{ airline: "All Nippon Airways", programs: ["ANA Mileage Club"] }, { airline: "Japan Airlines", programs: ["Japan Airlines Mileage Bank"] }],
  "NRT-JFK": [{ airline: "All Nippon Airways", programs: ["ANA Mileage Club"] }, { airline: "Japan Airlines", programs: ["Japan Airlines Mileage Bank"] }],
  "JFK-NRT": [{ airline: "All Nippon Airways", programs: ["ANA Mileage Club"] }, { airline: "Japan Airlines", programs: ["Japan Airlines Mileage Bank"] }],
  "NRT-SFO": [{ airline: "All Nippon Airways", programs: ["ANA Mileage Club"] }, { airline: "Japan Airlines", programs: ["Japan Airlines Mileage Bank"] }],
  "SFO-NRT": [{ airline: "All Nippon Airways", programs: ["ANA Mileage Club"] }, { airline: "Japan Airlines", programs: ["Japan Airlines Mileage Bank"] }],
  "NRT-ORD": [{ airline: "All Nippon Airways", programs: ["ANA Mileage Club"] }, { airline: "Japan Airlines", programs: ["Japan Airlines Mileage Bank"] }],
  "ORD-NRT": [{ airline: "All Nippon Airways", programs: ["ANA Mileage Club"] }, { airline: "Japan Airlines", programs: ["Japan Airlines Mileage Bank"] }],

  // Emirates Skywards — DXB hub
  "DXB-LHR": [{ airline: "Emirates", programs: ["Emirates Skywards"] }],
  "LHR-DXB": [{ airline: "Emirates", programs: ["Emirates Skywards"] }],
  "DXB-JFK": [{ airline: "Emirates", programs: ["Emirates Skywards"] }],
  "JFK-DXB": [{ airline: "Emirates", programs: ["Emirates Skywards"] }],
  "DXB-CDG": [{ airline: "Emirates", programs: ["Emirates Skywards"] }],
  "CDG-DXB": [{ airline: "Emirates", programs: ["Emirates Skywards"] }],
  "DXB-FRA": [{ airline: "Emirates", programs: ["Emirates Skywards"] }],
  "FRA-DXB": [{ airline: "Emirates", programs: ["Emirates Skywards"] }],
  "DXB-LAX": [{ airline: "Emirates", programs: ["Emirates Skywards"] }],
  "LAX-DXB": [{ airline: "Emirates", programs: ["Emirates Skywards"] }],
  "DXB-SYD": [{ airline: "Emirates", programs: ["Emirates Skywards"] }],
  "SYD-DXB": [{ airline: "Emirates", programs: ["Emirates Skywards"] }],
  "DXB-BKK": [{ airline: "Emirates", programs: ["Emirates Skywards"] }],
  "BKK-DXB": [{ airline: "Emirates", programs: ["Emirates Skywards"] }],
};

// ─── Static airline supplements ──────────────────────────────────────────────
// Travelpayouts doesn't index many African/regional carriers (Air Senegal,
// Transair, etc.) because they don't distribute through GDS/OTAs.
// This map injects known carriers for specific routes so the cost engine can
// show the right miles programs (e.g. Flying Blue for Air France partner routes).
//
// Key format: "ORIGIN-DEST" (canonical, uppercase). Both directions are listed.
// Values are airline NAMES (as used in iataAirlines.ts / alliances.ts).
// DO NOT add carriers you're unsure about — better to under-report than mislead.
export const ROUTE_AIRLINE_SUPPLEMENTS: Record<string, string[]> = {
  // West Africa ↔ Europe
  "DSS-CDG": ["Air Senegal", "Air France", "Corsair"],
  "CDG-DSS": ["Air Senegal", "Air France", "Corsair"],
  "DSS-LHR": ["Air Senegal"],
  "LHR-DSS": ["Air Senegal"],

  "LOS-CDG": ["Air France"],
  "CDG-LOS": ["Air France"],
  "LOS-LHR": ["British Airways"],
  "LHR-LOS": ["British Airways"],
  "LOS-FRA": ["Lufthansa"],
  "FRA-LOS": ["Lufthansa"],

  "ABJ-CDG": ["Air France"],
  "CDG-ABJ": ["Air France"],
  "ACC-LHR": ["British Airways"],
  "LHR-ACC": ["British Airways"],
  "CMN-CDG": ["Royal Air Maroc", "Air France"],
  "CDG-CMN": ["Royal Air Maroc", "Air France"],

  // East / Southern Africa ↔ Europe
  "NBO-LHR": ["British Airways", "Kenya Airways"],
  "LHR-NBO": ["British Airways", "Kenya Airways"],
  "NBO-CDG": ["Air France", "Kenya Airways"],
  "CDG-NBO": ["Air France", "Kenya Airways"],
  "JNB-LHR": ["British Airways", "South African Airways"],
  "LHR-JNB": ["British Airways", "South African Airways"],
  "ADD-CDG": ["Ethiopian Airlines", "Air France"],
  "CDG-ADD": ["Ethiopian Airlines", "Air France"],

  // West Africa ↔ North America (often via European hubs)
  "DSS-JFK": ["Air Senegal", "Air France"],
  "JFK-DSS": ["Air Senegal", "Air France"],
  "LOS-JFK": ["United"],
  "JFK-LOS": ["United"],

  // South Africa ↔ Europe
  "JNB-CDG": ["Air France", "South African Airways"],
  "CDG-JNB": ["Air France", "South African Airways"],
  "JNB-FRA": ["Lufthansa", "South African Airways"],
  "FRA-JNB": ["Lufthansa", "South African Airways"],

  // East Africa ↔ Europe (additional routes)
  "ADD-LHR": ["Ethiopian Airlines", "British Airways"],
  "LHR-ADD": ["Ethiopian Airlines", "British Airways"],
  "NBO-FRA": ["Lufthansa", "Kenya Airways"],
  "FRA-NBO": ["Lufthansa", "Kenya Airways"],

  // Kigali ↔ Europe (RwandAir hub)
  "KGL-LHR": ["RwandAir", "British Airways"],
  "LHR-KGL": ["RwandAir", "British Airways"],
  "KGL-CDG": ["RwandAir", "Air France"],
  "CDG-KGL": ["RwandAir", "Air France"],
  "KGL-BRU": ["RwandAir", "Brussels Airlines"],
  "BRU-KGL": ["RwandAir", "Brussels Airlines"],

  // ── Asia–Americas (B2 fix: KrisFlyer absent on SIN→LAX) ──────────────────
  // Singapore Airlines operates SIN-LAX direct (SQ37/SQ38).
  // KrisFlyer is the primary program but rarely surfaces via Travelpayouts.
  "SIN-LAX": ["Singapore Airlines"],
  "LAX-SIN": ["Singapore Airlines"],
  "SIN-JFK": ["Singapore Airlines"],
  "JFK-SIN": ["Singapore Airlines"],
  "SIN-SFO": ["Singapore Airlines"],
  "SFO-SIN": ["Singapore Airlines"],

  // ── Japan–Americas (B3 fix: ANA + JAL absent on NRT→LAX) ─────────────────
  // ANA (NH) and JAL (JL) are the two primary Japanese carriers.
  // Both operate NRT/HND–LAX/JFK/SFO and codeshare extensively on Star/Oneworld.
  "NRT-LAX": ["All Nippon Airways", "Japan Airlines"],
  "LAX-NRT": ["All Nippon Airways", "Japan Airlines"],
  "NRT-JFK": ["All Nippon Airways", "Japan Airlines"],
  "JFK-NRT": ["All Nippon Airways", "Japan Airlines"],
  "NRT-SFO": ["All Nippon Airways", "Japan Airlines"],
  "SFO-NRT": ["All Nippon Airways", "Japan Airlines"],
  "NRT-ORD": ["All Nippon Airways", "Japan Airlines"],
  "ORD-NRT": ["All Nippon Airways", "Japan Airlines"],
  "HND-LAX": ["All Nippon Airways", "Japan Airlines"],
  "LAX-HND": ["All Nippon Airways", "Japan Airlines"],
  "HND-JFK": ["All Nippon Airways", "Japan Airlines"],
  "JFK-HND": ["All Nippon Airways", "Japan Airlines"],

  // ── Gulf–Europe/Americas (B4 fix: Emirates Skywards absent on DXB routes) ──
  // Emirates operates DXB→LHR, DXB→JFK, DXB→CDG etc. directly (EK).
  // Skywards is the dominant redemption program in the Gulf region.
  "DXB-LHR": ["Emirates"],
  "LHR-DXB": ["Emirates"],
  "DXB-JFK": ["Emirates"],
  "JFK-DXB": ["Emirates"],
  "DXB-CDG": ["Emirates", "Air France"],
  "CDG-DXB": ["Emirates", "Air France"],
  "DXB-FRA": ["Emirates", "Lufthansa"],
  "FRA-DXB": ["Emirates", "Lufthansa"],
  "DXB-LAX": ["Emirates"],
  "LAX-DXB": ["Emirates"],
  "DXB-SYD": ["Emirates"],
  "SYD-DXB": ["Emirates"],
  "DXB-BKK": ["Emirates"],
  "BKK-DXB": ["Emirates"],
};

/**
 * Discover airlines that operate a route by querying v3 WITHOUT a date filter.
 * Merges Travelpayouts data with static supplements for routes with poor GDS coverage
 * (primarily African carriers that don't distribute through OTAs).
 */
export async function discoverRouteAirlines(
  attempts: Array<[string, string]>,
  token: string
): Promise<string[]> {
  // Check static supplements first (keyed by first attempt = canonical code pair)
  const [primaryFrom, primaryTo] = attempts[0] ?? ["", ""];
  const supplementKey = `${primaryFrom.toUpperCase()}-${primaryTo.toUpperCase()}`;
  const supplements = ROUTE_AIRLINE_SUPPLEMENTS[supplementKey] ?? [];

  for (const [o, d] of attempts) {
    const url = new URL(`${TP_BASE}/aviasales/v3/prices_for_dates`);
    url.searchParams.set("origin", o.toUpperCase());
    url.searchParams.set("destination", d.toUpperCase());
    url.searchParams.set("currency", "usd");
    url.searchParams.set("sorting", "price");
    url.searchParams.set("unique", "true");   // one per airline
    url.searchParams.set("limit", "10");
    url.searchParams.set("token", token);

    try {
      const res = await fetch(url.toString(), {
        next: { revalidate: 86400 },          // cache 24h — airline roster changes slowly
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { data?: Array<{ airline: string }> };
      if (Array.isArray(json.data) && json.data.length > 0) {
        const fromApi = json.data
          .map((f) => iataToAirline(f.airline))
          .filter((n): n is string => n !== null);  // skip virtual ZZ/YP/ZG codes
        // Merge API result with supplements — deduplicated, supplements appended
        const merged = Array.from(new Set([...fromApi, ...supplements]));
        return merged;
      }
    } catch { /* try next attempt pair */ }
  }

  // Travelpayouts returned nothing — return supplements only so the cost engine
  // can still compute miles options for the known carriers on this route.
  return supplements;
}

// ─── Enrich a synthetic flight (no miles calculation) ────────────────────────
// Synthetic flights are airlines we know serve a route but whose prices are not
// in any provider index. We show them as "Vol direct disponible" with an
// indicative price range (~min – min×1.3). They are NOT ranked with real
// flights and receive NO miles options.

export function enrichSynthetic(
  f: NormalizedFlight,
  cabin: Cabin,
  passengers: number,
  tripType: TripType,
  searchDate?: string,
  returnDate?: string,
): FlightResult {
  // Synthetics are built from the cheapest TP price (economy base).
  // If that cheapest price came from a Duffel flight (cabinResolved=true),
  // it already reflects the requested cabin — don't double-apply the multiplier.
  const multiplier    = f.cabinResolved ? 1 : CABIN_MULTIPLIER[cabin];
  const outboundPrice = Math.round(f.price * multiplier * 100) / 100;
  // For roundtrips, double the price (synthetic has no real return leg — we mirror
  // the outbound as a best estimate). Same logic as real roundtrips in enrich().
  const legCount      = tripType === "roundtrip" ? 2 : 1;
  const totalPrice    = Math.round(outboundPrice * legCount * passengers * 100) / 100;

  const result: FlightResult = {
    from:    f.from,
    to:      f.to,
    price:   outboundPrice,
    airlines: f.airlines,
    stops:    f.stops ?? 0,
    duration: f.duration,
    tripType,
    cabin,
    passengers,
    totalPrice,
    cashCost:            totalPrice,
    milesCost:           0,
    savings:             0,
    recommendation:      "USE_CASH",
    bestOption:          null,
    milesOptions:        [],
    explanation:         "Prix indicatif — vol direct disponible",
    displayMessage:      "💵 Prix indicatif",
    disclaimer:          "Prix estimé, non garanti",
    cabinPriceEstimated: !f.cabinResolved && cabin !== "economy",
    searchId:            "",   // filled by caller
    optimization:        { type: "CASH" },
    isSupplemental:      true,
    source:              "SYNTHETIC",
    priceConfidence:     "ESTIMATED",
  };

  if (tripType === "roundtrip" && searchDate && returnDate && f.from && f.to) {
    const departureDateCompact = searchDate.replace(/-/g, "");
    const returnDateCompact    = returnDate.replace(/-/g, "");
    result.bookingLink = `${AVIASALES_BASE_URL}/search/${f.from}${departureDateCompact}${f.to}${returnDateCompact}${f.from}${passengers}?marker=${TP_MARKER}`;
  } else if (searchDate && f.from && f.to) {
    const dateCompact = searchDate.replace(/-/g, "");
    result.bookingLink = `${AVIASALES_BASE_URL}/search/${f.from}${dateCompact}${f.to}${passengers}?marker=${TP_MARKER}`;
  }

  return result;
}

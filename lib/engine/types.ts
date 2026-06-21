import type { MilesOption } from "../costEngine";
import type { OptimizerDecision } from "../optimizer";

export type TripType = "oneway" | "roundtrip";
export type Stops    = "any" | "direct" | "with_stops";
export type Cabin    = "economy" | "premium" | "business" | "first";

export interface SearchParams {
  from: string;
  to: string;
  date: string;            // YYYY-MM-DD departure
  returnDate?: string;     // YYYY-MM-DD return leg (roundtrip only)
  tripType?: TripType;     // default "oneway"
  stops?: Stops;           // default "any"
  cabin?: Cabin;           // default "economy"
  passengers?: number;     // default 1
  userPrograms?: string[];
}

// ─── Public API surface ──────────────────────────────────────────────────────
export interface FlightResult {
  from: string;
  to: string;
  price: number;           // per-person outbound price (cabin + promo applied)
  airlines: string[];
  stops?: number;
  duration?: number;
  tripType: TripType;
  returnPrice?: number;
  returnAirlines?: string[];
  totalPrice?: number;     // (price + returnPrice) × passengers
  cabin: Cabin;
  passengers: number;
  bookingLink?: string;    // Travelpayouts deep link (aviasales v3 only)

  // ── Cost comparison ────────────────────────────────────────────────────────
  cashCost: number;                       // total cash price
  milesCost: number;                      // total cost of best miles option
  savings: number;                        // |cashCost - milesCost|
  recommendation: "USE_MILES" | "USE_CASH" | "IF_HAVE_MILES";
  /** True when cashCost was estimated via CABIN_MULTIPLIER (no real cabin price
   *  from Duffel). In that case the miles-vs-cash comparison is unreliable, so
   *  recommendation is forced to "IF_HAVE_MILES" and the UI must show a disclaimer. */
  priceIsEstimate?: boolean;
  bestOption: MilesOption | null;         // cheapest miles scenario
  milesOptions: MilesOption[];            // all options for detail view
  explanation: string;                    // human-readable reason
  displayMessage: string;
  disclaimer: string;

  // ── Cabin price accuracy ───────────────────────────────────────────────────
  cabinPriceEstimated: boolean;   // true when price = economy × multiplier (not real cabin price)
  searchId: string;               // UUID per search — used for click tracking

  // ── Extra ──────────────────────────────────────────────────────────────────
  optimization: OptimizerDecision;
  /**
   * True when this flight entry was synthetically injected for an airline
   * known to fly the route but absent from Travelpayouts' index.
   * Price is indicative (derived from cheapest available TP fare).
   * UI must surface a "prix indicatif" disclaimer.
   */
  isSupplemental?: boolean;
  /** Data origin: Duffel (real-time booking API), Travelpayouts (cache-based), or synthetic */
  source?: "DUFFEL" | "TP" | "SYNTHETIC";
  /** How reliable the price is — HIGH = Duffel live price, LOW = TP cached, ESTIMATED = synthetic floor */
  priceConfidence?: "HIGH" | "LOW" | "ESTIMATED";

  // ── Verdict (for UI display) ───────────────────────────────────────────────
  /** Explicit verdict for user decision: "Cash wins / Miles win / Need transfer" */
  verdictLabel?: string;
}

// ─── Cabin price multipliers (estimation when API doesn't filter by cabin) ───
export const CABIN_MULTIPLIER: Record<Cabin, number> = {
  economy:  1.0,
  premium:  1.8,
  business: 4.0,
  first:    6.5,
};

export interface CalendarDay {
  date: string;      // YYYY-MM-DD
  price: number;     // cheapest price USD
  stops: number;
  duration?: number;
}

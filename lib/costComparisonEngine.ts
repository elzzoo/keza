// lib/costComparisonEngine.ts
// Main orchestration: builds cost comparison, deduplication, ranking, and final recommendations.

import { roundPrice } from "./roundPrice";
import { getZone } from "./zones";
import { getAwardTaxes } from "@/data/awardTaxes";
import { getMilesRequired } from "@/data/awardCharts";
import { logWarn } from "./logger";
import type { Confidence } from "@/data/milesPrices";
import { ALLIANCES } from "./alliances";
import { PROGRAMS_BY_NAME } from "./globalPrograms";
import { buildScenarios, type Scenario } from "./scenarioEngine";
import { PROGRAM_TO_AIRLINE, getProgramsForAirline, getCorridorGuarantees } from "./programEngine";
import { buildOption, synthesizeTransferOptions, synthesizeDynamicOptions, synthesizeAcquisitionOptions, filterZoneAwareOptions, accessibilityPenalty } from "./optionBuilder";
import { getBonusTransfers } from "./costEngine";
import { AIRPORTS, type Airport } from "@/data/airports";
import type { Cabin, TripType } from "./engine";

// ─── Public types ─────────────────────────────────────────────────────────────

export type Recommendation = "USE_MILES" | "USE_CASH" | "IF_HAVE_MILES";
export type Verdict = "MILES_WINS" | "CASH_WINS" | "NO_OPTION";

export interface FlightInput {
  from: string;
  to: string;
  totalPrice: number;
  airlines: string[];
  stops: number;
  cabin: Cabin;
  tripType: TripType;
  passengers: number;
}

export interface MilesOption {
  type: "DIRECT" | "ALLIANCE" | "TRANSFER";
  program: string;
  via?: string;                   // source program for TRANSFER (e.g. "Amex MR")
  operatingAirline: string;
  milesRequired: number;
  taxes: number;

  // Core calculation: milesCost = (milesRequired × valuePerMile) + taxes
  valuePerMile: number;           // market value in cents (e.g. 1.5 = $0.015)
  milesCost: number;              // milesRequired × valuePerMile in dollars
  totalMilesCost: number;         // milesCost + taxes = REAL COST of this option
  savings: number;                // cashTotal - totalMilesCost (positive = miles cheaper)

  confidence: Confidence;         // HIGH / MEDIUM / LOW
  promoApplied?: string;
  explanation: string;     // e.g. "Flying Blue direct · 30 000 miles + $300 taxes"
  isBestDeal: boolean;     // true only on the cheapest option after deduplication
  chartSource: "REAL" | "ESTIMATE";
}

export interface CostComparison {
  cashCost: number;               // total flight price in cash
  milesCost: number;              // total cost of best miles option (0 if none)
  savings: number;                // cashCost - milesCost: positive = miles cheaper, negative = cash cheaper
  recommendation: Recommendation; // USE_MILES or USE_CASH — binary, no ambiguity
  bestOption: MilesOption | null; // the cheapest miles scenario
  milesOptions: MilesOption[];    // all computed options for detail view
  scenarios?: Scenario[];         // NEW — same data as milesOptions, typed as Scenario[]
  explanation: string;            // kept for backward compat
  displayMessage: string;         // "🔥 Tu économises $X" or "❌ Les miles coûtent $X de plus"
  disclaimer: string;             // trust disclaimer shown on every result
  verdictLabel?: Verdict;         // explicit verdict: MILES_WINS | CASH_WINS | NO_OPTION
}

// Pre-built Map for O(1) airport lookup (AIRPORTS has 410 entries — linear scan per call is wasteful)
const AIRPORTS_BY_CODE: Map<string, Airport> = new Map(AIRPORTS.map(a => [a.code, a]));

/**
 * Generate verdict label from recommendation and option availability.
 */
export function generateVerdictLabel(recommendation: Recommendation, hasBestOption: boolean): Verdict {
  if (!hasBestOption) return "NO_OPTION";
  return recommendation === "USE_MILES" ? "MILES_WINS" : "CASH_WINS";
}

/**
 * Build a cost comparison between cash and miles options for a given flight.
 *
 * Computes miles costs across all available programs, applies taxes, handles
 * transfer bonuses, and synthesizes dynamic transfer recommendations. Returns
 * a ranked list of miles options plus a recommendation (USE_MILES, USE_CASH, or IF_HAVE_MILES).
 *
 * @param flight - Flight details including from/to, cash price, cabin, passengers, airlines
 * @param effectivePrices - Map of program names to effective mile value (cents)
 * @returns Cost comparison with cashCost, milesCost, savings, best option, and all scenarios
 */
export function buildCostOptions(
  flight: FlightInput,
  effectivePrices: Map<string, number>
): CostComparison {
  const { from, to, totalPrice: cashTotal, airlines, cabin, tripType } = flight;
  const passengers = Math.max(1, Math.round(flight.passengers || 1)); // defensive: always ≥ 1

  // Guard: no valid cash price → skip miles comparison entirely
  if (!cashTotal || cashTotal <= 0) {
    logWarn(`[costEngine] Zero cash price for ${from}→${to} (cabin=${cabin}, tripType=${tripType}). Input: ${JSON.stringify({ cashTotal, airlines, passengers })}`);
    return {
      cashCost: 0, milesCost: 0, savings: 0,
      recommendation: "USE_CASH",
      bestOption: null,
      milesOptions: [],
      scenarios: [],
      explanation: "No cash price available.",
      displayMessage: "no_cash_price",
      disclaimer: "",
    };
  }

  const originZone = getZone(from) ?? undefined;
  const destZone   = getZone(to)   ?? undefined;
  const operatingAirline = airlines[0] ?? "";

  const milesOptions: MilesOption[] = [];

  // ── Pre-compute airport coordinates (used for dynamic global options) ───────
  const fromAirport = AIRPORTS_BY_CODE.get(from);
  const toAirport   = AIRPORTS_BY_CODE.get(to);

  // ── Direct + Alliance options ──────────────────────────────────────────────
  // Pass the FULL airlines array so multi-airline routes (month-matrix +
  // discoverRouteAirlines) find the right programs even when airlines[0] is
  // an independent carrier that would otherwise block the guarantee logic.
  const programs = getProgramsForAirline(airlines);

  // Zone fallback: fires when no airline-based program was found AND zones are
  // known. This covers month-matrix results where discoverRouteAirlines failed
  // or returned only an empty-string airline.
  const useZoneFallback = programs.length === 0 && originZone && destZone;
  const operatingAlliance = ALLIANCES[operatingAirline] ?? null;

  const effectivePrograms: Array<{ program: string; type: "DIRECT" | "ALLIANCE"; inferredAirline: string }> = useZoneFallback
    ? (() => {
        const base: Array<{ program: string; type: "DIRECT" | "ALLIANCE"; inferredAirline: string }> =
          Object.entries(PROGRAM_TO_AIRLINE)
          .filter(([program, programAirline]) => {
            if (PROGRAMS_BY_NAME[program]?.isBookable === false) return false;
            // Empty/null airline: completely unknown — allow all programs (no data to filter on).
            if (!operatingAirline) return true;
            // Airline name known but NOT in alliances map: treat like Independent (apply the same
            // guard). This handles carriers like Fiji Airways, Saudia*, or any airline we haven't
            // catalogued yet — prevents Delta SkyMiles from leaking onto a Fiji Airways SIN→LAX
            // flight just because FJ's alliance is unknown. Corridor guarantees (KrisFlyer, ANA,
            // JAL for ASIA→NA) still inject the correct programs regardless of zone fallback.
            // (*Saudia has its own alliances.ts entry; this covers future unlisted carriers.)
            if (!operatingAlliance) {
              const progAlliance = ALLIANCES[programAirline];
              if (!progAlliance || progAlliance === "Independent") return true;
              return airlines.some((a) => ALLIANCES[a] === progAlliance);
            }
            // Independent carriers: only allow programs whose alliance has at least one airline
            // present in the FULL airlines list for this flight, or Independent programs.
            // This prevents e.g. LifeMiles (Star Alliance) from appearing on a Kuwait Airways
            // DXB→LHR flight (no Star Alliance metal on that specific itinerary), while still
            // allowing Emirates Skywards (Independent) for any Independent-carrier flight.
            // Exception: when airlines list is empty or all-unknown, fall back to allow-all so
            // we don't accidentally hide all options for truly unknown carriers.
            if (operatingAlliance === "Independent") {
              const progAlliance = ALLIANCES[programAirline];
              if (!progAlliance || progAlliance === "Independent") return true;
              return airlines.some((a) => ALLIANCES[a] === progAlliance);
            }
            // Alliance airline: only show same-alliance programs
            return ALLIANCES[programAirline] === operatingAlliance;
          })
          .map(([program, airline]) => ({
            program,
            type: "ALLIANCE" as const,
            inferredAirline: airline,
          }));

        return base;
      })()
    // Normal path: use matchedAirline (the specific airline that caused the
    // match) as inferredAirline so tax calculation uses the correct carrier —
    // not necessarily airlines[0] which may be a different airline.
    : programs.map((p) => ({ ...p, inferredAirline: p.matchedAirline }));

  // ── Apply corridor guarantees (pre-loop, unconditional) ────────────────────
  // Ensures flagship programs appear on their primary corridors regardless of
  // which specific airline Travelpayouts returned. Only adds programs not
  // already in effectivePrograms (no duplicates).
  //
  // Type assignment: a corridor-guaranteed program is set to DIRECT only when
  // the program's inferred airline actually appears in the flight's airlines list.
  // Example: KrisFlyer with inferredAirline "Singapore Airlines" on a BA-operated
  // NRT→LAX connecting flight via LHR → type ALLIANCE (you cannot redeem KrisFlyer
  // on BA metal). On an actual SQ-operated SIN→LAX flight → type DIRECT.
  const corridorGuaranteedPrograms = new Set<string>();
  if (originZone && destZone) {
    for (const g of getCorridorGuarantees(originZone, destZone, airlines)) {
      corridorGuaranteedPrograms.add(g.program);
      // DIRECT only when the inferred home carrier IS operating this specific flight
      const resolvedType: "DIRECT" | "ALLIANCE" =
        airlines.includes(g.inferredAirline) ? "DIRECT" : "ALLIANCE";
      if (!effectivePrograms.some((p) => p.program === g.program)) {
        effectivePrograms.push({ ...g, type: resolvedType });
      } else if (resolvedType === "DIRECT") {
        // Upgrade an existing ALLIANCE entry to DIRECT when home carrier confirmed
        const idx = effectivePrograms.findIndex(p => p.program === g.program);
        if (idx >= 0 && effectivePrograms[idx].type !== "DIRECT") {
          effectivePrograms[idx] = { ...effectivePrograms[idx], type: "DIRECT" };
        }
      }
    }
  }

  for (const entry of effectivePrograms) {
    // Always use the matched/inferred airline for taxes — this is the airline
    // the program actually uses on this route, regardless of which carrier
    // Travelpayouts happened to list first.
    const airlineForTaxes = entry.inferredAirline;
    const safeOriginZone = originZone || "EUROPE";
    const safeDestZone = destZone || "EUROPE";
    if (!originZone || !destZone) {
      // Fallback for unknown zones: use EUROPE as conservative estimate.
      // Unknown zones typically occur on regional/secondary airports (e.g., BJS, DSS).
      // EUROPE fallback is conservative (2-3x multiplier on some routes), so results
      // should be treated as estimates. Consider distance-based fallback in future.
      logWarn(`[costEngine] Unknown zone for ${from}→${to}: using EUROPE fallback`);
      const { miles, source } = getMilesRequired(entry.program, "EUROPE", "EUROPE", cabin, tripType, passengers);
      const taxes = getAwardTaxes(airlineForTaxes, cabin, passengers, from, to, safeOriginZone, safeDestZone)
        * (tripType === "roundtrip" ? 2 : 1);
      milesOptions.push(buildOption(entry.type, entry.program, undefined, airlineForTaxes, miles, source, taxes, cashTotal, effectivePrices));
      continue;
    }
    const { miles, source } = getMilesRequired(entry.program, originZone, destZone, cabin, tripType, passengers);
    const taxes = getAwardTaxes(airlineForTaxes, cabin, passengers, from, to, safeOriginZone, safeDestZone)
      * (tripType === "roundtrip" ? 2 : 1);
    milesOptions.push(buildOption(entry.type, entry.program, undefined, airlineForTaxes, miles, source, taxes, cashTotal, effectivePrices));
  }

  // ── Transfer options ──────────────────────────────────────────────────────
  milesOptions.push(...synthesizeTransferOptions(
    milesOptions,
    getBonusTransfers(),
    { from, to, totalPrice: cashTotal, airlines, cabin, tripType, passengers },
    effectivePrices,
  ));

  // ── Dynamic global options (for routes/programs not in hardcoded charts) ──
  // Uses distance-based estimation to suggest ANY program worldwide
  if (fromAirport && toAirport) {
    milesOptions.push(...synthesizeDynamicOptions(
      milesOptions,
      { from, to, totalPrice: cashTotal, airlines, cabin, tripType, passengers },
      effectivePrices,
    ));

    // ── Acquisition options: "Buy miles and use them" ───────────────────────
    // For the top 5 cheapest programs, check if BUYING miles is still cheaper than cash
    const sortedForAcquisition = [...milesOptions]
      .sort((a, b) => a.totalMilesCost - b.totalMilesCost)
      .slice(0, 5);

    milesOptions.push(...synthesizeAcquisitionOptions(
      sortedForAcquisition,
      cashTotal,
      effectivePrices,
    ));
  }

  // ── Zone-aware program filter ──────────────────────────────────────────────
  // Prevents geographically irrelevant programs from surfacing on routes they
  // have no operational connection to. Applied BEFORE deduplication so phantom
  // entries don't influence the bestOption ranking.
  const filteredMilesOptions = filterZoneAwareOptions(milesOptions, originZone, destZone);

  // ── Deduplicate: keep cheapest option per (program + via) key ─────────────
  const seen = new Map<string, MilesOption>();
  for (const opt of filteredMilesOptions) {
    const key = `${opt.program}::${opt.via ?? ""}`;
    const existing = seen.get(key);
    // Prefer DIRECT over ALLIANCE when cost is equal — avoids labeling a
    // direct-airline redemption as "alliance" just because the corridor
    // guarantee added it first.
    const cheaper = !existing || opt.totalMilesCost < existing.totalMilesCost;
    const samePrice = existing && opt.totalMilesCost === existing.totalMilesCost;
    const betterType = samePrice && opt.type === "DIRECT" && existing.type !== "DIRECT";
    if (cheaper || betterType) {
      seen.set(key, opt);
    }
  }

  const sortedOptions = Array.from(seen.values())
    .sort((a, b) =>
      a.totalMilesCost * accessibilityPenalty(a.program) -
      b.totalMilesCost * accessibilityPenalty(b.program)
    );

  // Corridor-guaranteed programs always appear FIRST, then remaining options sorted by cost.
  // This ensures flagship programs (KrisFlyer, ANA, JAL, Emirates, Flying Blue) are always
  // visible at the top of every card on their primary corridors — never buried past position 12.
  const corridorOpts    = sortedOptions.filter(o =>  corridorGuaranteedPrograms.has(o.program));
  const nonCorridorOpts = sortedOptions.filter(o => !corridorGuaranteedPrograms.has(o.program));
  const dedupedOptions  = [
    ...corridorOpts,
    ...nonCorridorOpts.slice(0, Math.max(0, 12 - corridorOpts.length)),
  ];

  // ── DECISION: accessible-first bestOption ─────────────────────────────────
  // IMPORTANT: bestOption selection uses sortedOptions (penalized-cost order), NOT
  // dedupedOptions (corridor-first display order). This preserves the invariant that
  // bestOption is always the cheapest accessible program — independent of display ordering.
  // Score-3 niche programs (SAA Voyager, Air China PhoenixMiles, etc.) may rank cheapest
  // by raw cost but are inaccessible to most users. Fall back to raw cheapest only when
  // no accessible (score ≤ 2) option exists.
  //
  // DIRECT-program preference (UX policy):
  // When a DIRECT program (home-carrier redemption) exists and its cost is within 5%
  // of the cheapest accessible option, prefer it as the headline recommendation.
  // Rationale: on SIN→LAX operated by Singapore Airlines, showing KrisFlyer as #1
  // (if competitively priced) is more useful — it confirms the home-carrier redemption
  // option the user expects. But never override a significantly cheaper program.
  // 5% threshold ensures we show best value while respecting home-carrier when competitive.
  let bestOption: MilesOption | null = null;
  if (sortedOptions.length > 0) {
    const cheapestAccessible = sortedOptions.find(
      (o) => (PROGRAMS_BY_NAME[o.program]?.accessibilityScore ?? 2) <= 2,
    ) ?? null;

    // Look for an accessible DIRECT program within 5% of cheapest accessible
    const directAccessible = cheapestAccessible
      ? (sortedOptions.find(
          (o) =>
            o.type === "DIRECT" &&
            (PROGRAMS_BY_NAME[o.program]?.accessibilityScore ?? 2) <= 2 &&
            o.totalMilesCost <= cheapestAccessible.totalMilesCost * 1.05,
        ) ?? null)
      : null;

    bestOption = directAccessible ?? cheapestAccessible ?? sortedOptions[0];
    // isBestDeal marks the best available miles option (cheapest accessible program).
    // It is unconditional: it identifies the best miles deal, not whether miles beat cash.
    // The UI must check `recommendation === "USE_MILES"` to decide whether to suggest using miles.
    bestOption.isBestDeal = true;
  }
  const bestMilesCost = bestOption?.totalMilesCost ?? Infinity;
  const signedSavings = cashTotal - bestMilesCost;  // positive = miles cheaper, negative = cash cheaper
  const savings = roundPrice(signedSavings);  // keep sign — UI uses recommendation to determine direction

  // USE_MILES only when miles save at least $10 AND at least 1.5% of the cash total.
  // The absolute floor prevents recommending miles for $1–$9 trivial "savings".
  // The percentage floor prevents recommending miles on a $2000 business ticket
  // where the $10 savings is within the noise of award chart variability.
  const MIN_SAVINGS_USD = 10;
  const MIN_SAVINGS_PCT = 0.015; // 1.5%
  const recommendation: Recommendation = (
    bestOption !== null &&
    bestOption.totalMilesCost < cashTotal &&
    (cashTotal - bestOption.totalMilesCost) >= MIN_SAVINGS_USD &&
    (cashTotal - bestOption.totalMilesCost) >= cashTotal * MIN_SAVINGS_PCT
  ) ? "USE_MILES" : "USE_CASH";

  // NOTE: displayMessage is not rendered by the UI (FlightCard generates it client-side
  // with the user's currency via fmt()). This server-side value is kept for logging only.
  const displayMessage: string = !bestOption
    ? "no_miles_option"
    : recommendation === "USE_MILES"
      ? `miles_cheaper:${Math.round(savings)}`          // savings > 0
      : `cash_cheaper:${Math.round(Math.abs(savings))}`; // savings ≤ 0 → log absolute amount

  // Trust disclaimer
  const disclaimer =
    "⚠️ Prix indicatifs basés sur tarifs réels et valeurs de miles estimées — vérifiez la disponibilité avant de réserver.";

  // Legacy explanation string
  const explanation = bestOption
    ? recommendation === "USE_MILES"
      ? `Économisez ${Math.round(savings)} en utilisant ${bestOption.program}${bestOption.via ? ` via ${bestOption.via}` : ""} (${bestOption.milesRequired.toLocaleString()} miles + ${bestOption.taxes} taxes = ${bestMilesCost} vs ${cashTotal} cash)`
      : signedSavings < 0
        ? `Le cash est moins cher de ${Math.round(Math.abs(savings))}. Miles coûteraient ${bestMilesCost} vs ${cashTotal} cash.`
        : `Quasi identique — cash légèrement avantageux de ${Math.round(Math.abs(savings))}.`
    : `Aucune option miles disponible. Payez en cash (${cashTotal}).`;

  const verdictLabel = generateVerdictLabel(recommendation, bestOption !== null);

  return {
    cashCost: cashTotal,
    milesCost: bestOption ? bestMilesCost : 0,
    savings,
    recommendation,
    displayMessage,
    disclaimer,
    bestOption,
    milesOptions: dedupedOptions,
    scenarios: buildScenarios(dedupedOptions),
    explanation,
    verdictLabel,
  };
}

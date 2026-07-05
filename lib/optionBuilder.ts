// lib/optionBuilder.ts
// Option building, synthesis, and zone-aware filtering.

import { roundPrice } from "./roundPrice";
import { getZone } from "./zones";
import { getAwardTaxes } from "@/data/awardTaxes";
import { getMilesRequired } from "@/data/awardCharts";
import { MILES_PRICE_MAP, MILES_CONFIDENCE_MAP, DEFAULT_MILE_VALUE_CENTS, type Confidence } from "@/data/milesPrices";
import { getEffectiveRatio } from "@/data/transferBonuses";
import type { TransferBonusRecord } from "@/data/transferBonuses";
import { ALLIANCES } from "./alliances";
import { estimateMilesRequired, type CabinClass } from "./dynamicAwardEngine";
import { GLOBAL_PROGRAMS, PROGRAMS_BY_NAME } from "./globalPrograms";
import { calculateAcquisitionCost } from "./milesAcquisition";
import { AIRPORTS, type Airport } from "@/data/airports";
import { PROGRAM_TO_AIRLINE } from "./programEngine";
import type { Cabin, TripType } from "./engine";
import type { MilesOption } from "./costComparisonEngine";
import { getAwardTaxes as getAwardTaxesForTransfer } from "@/data/awardTaxes";

// Pre-built Map for O(1) airport lookup (AIRPORTS has 410 entries — linear scan per call is wasteful)
const AIRPORTS_BY_CODE: Map<string, Airport> = new Map(AIRPORTS.map(a => [a.code, a]));

// ─── Helper: build one MilesOption ───────────────────────────────────────────

export function buildOption(
  type: "DIRECT" | "ALLIANCE" | "TRANSFER",
  program: string,
  via: string | undefined,
  operatingAirline: string,
  milesRequired: number,
  chartSource: "REAL" | "ESTIMATE",
  taxes: number,
  cashTotal: number,
  effectivePrices: Map<string, number>,
): MilesOption {
  // For DIRECT/ALLIANCE: valuePerMile = destination program's cents/mile.
  // For TRANSFER: milesCost uses the SOURCE currency's cents/unit (opportunity
  // cost — e.g. Amex MR 2.0¢ per MR point burned), while valuePerMile also
  // reflects that source value so the UI formula stays self-consistent.
  // This is intentional: "how much does it cost me to burn X Amex MR points?"
  // is the right pricing question for a transfer.  The destination program's
  // own value (e.g. FB 1.5¢) would understate the true cost.
  const sourceProgram = via ?? program;
  const baseCents =
    effectivePrices.get(sourceProgram) ??
    effectivePrices.get(program) ??
    MILES_PRICE_MAP.get(sourceProgram) ??
    MILES_PRICE_MAP.get(program) ??
    DEFAULT_MILE_VALUE_CENTS;

  // valuePerMile — source currency value for TRANSFER, destination for others.
  // UI must label it "¢/pt" (not "¢/mile") when type === "TRANSFER" to avoid
  // implying that destination miles carry this valuation.
  const valuePerMile = baseCents;

  // ═══════════════════════════════════════════════════════════════════════════
  // CORE FORMULA:  totalMilesCost = (milesRequired × valuePerMile) + taxes
  // For TRANSFER: milesRequired = destination miles needed; valuePerMile =
  // source currency cost/unit (assumes 1:1 ratio at transfer time).
  // ═══════════════════════════════════════════════════════════════════════════
  const milesCost      = roundPrice((milesRequired * valuePerMile) / 100);
  const totalMilesCost = roundPrice(milesCost + taxes);
  const savings        = roundPrice(cashTotal - totalMilesCost);

  const confidence: Confidence =
    MILES_CONFIDENCE_MAP.get(sourceProgram) ??
    MILES_CONFIDENCE_MAP.get(program) ??
    "LOW";

  const explanation = buildOptionExplanation(type, program, via, milesRequired, taxes, undefined);

  return {
    type,
    program,
    via,
    operatingAirline,
    milesRequired,
    taxes,
    valuePerMile,
    milesCost,
    totalMilesCost,
    savings,
    confidence,
    explanation,
    isBestDeal: false,
    chartSource,
  };
}

// ─── Helper: human-readable per-option explanation ────────────────────────────

export function buildOptionExplanation(
  type: "DIRECT" | "ALLIANCE" | "TRANSFER",
  program: string,
  via: string | undefined,
  milesRequired: number,
  taxes: number,
  promoApplied: string | undefined,
): string {
  const typeLabel =
    type === "DIRECT"   ? "direct" :
    type === "ALLIANCE" ? "alliance" :
    via?.startsWith("Achat") ? `achat via ${via}` :
    `transfert ${via ?? ""}`;

  const milesFormatted = milesRequired.toLocaleString("fr-FR");
  const promoNote = promoApplied ? ` · ${promoApplied}` : "";

  return `${program} (${typeLabel}) · ${milesFormatted} miles + $${taxes} taxes${promoNote}`;
}

// ─── Dynamic engine: per-program regional zone filter ────────────────────────
// Declared at module level (NOT inside the per-program loop) so the object is
// allocated ONCE and reused across all calls.
// Programs not listed here are allowed on any route.
export const DYNAMIC_PROGRAM_SERVED_ZONES: Partial<Record<string, string[]>> = {
  "Air India Flying Returns":      ["ASIA", "EUROPE", "NORTH_AMERICA", "MIDDLE_EAST"],
  "Korean Air SKYPASS":            ["ASIA", "NORTH_AMERICA", "EUROPE"],
  "Thai Royal Orchid Plus":        ["ASIA", "EUROPE", "MIDDLE_EAST"],
  "Garuda GarudaMiles":            ["ASIA", "EUROPE", "NORTH_AMERICA"],
  "EVA Air Points":                ["ASIA", "EUROPE", "NORTH_AMERICA"],
  "Asiana Airlines Club":          ["ASIA", "EUROPE", "NORTH_AMERICA"],
  "Vietnam Airlines Lotusmiles":   ["ASIA"],
  "China Southern Sky Pearl Club": ["ASIA", "NORTH_AMERICA", "EUROPE"],
  "China Eastern Eastern Miles":   ["ASIA", "NORTH_AMERICA", "EUROPE"],
  "Hainan Fortune Wings Club":     ["ASIA"],
  "Aeromexico Club Premier":       ["NORTH_AMERICA", "SOUTH_AMERICA", "EUROPE"],
  "LATAM Pass":                    ["SOUTH_AMERICA", "NORTH_AMERICA", "EUROPE"],
};

// ─── Dynamic engine: per-program home-airport filter ─────────────────────────
// Prevents niche programs from appearing on routes with no home-country endpoint.
// Declared at module level — NOT inside the per-program loop.
const DYNAMIC_PROGRAM_HOME_AIRPORTS: Partial<Record<string, Set<string>>> = {
  "Air India Flying Returns": new Set([
    "DEL","BOM","CCU","MAA","HYD","BLR","AMD","GOI","COK","TRV",
    "IXC","ATQ","IXR","IXD","SXR","LKO","BBI","NAG","PAT","IXB",
    "GAU","VGA","VTZ","IXM","IXZ","CNN","IXE","IXA","DIB","IMF",
  ]),
  "Garuda GarudaMiles": new Set([
    "CGK","SUB","BDO","SRG","MES","YIA","KNO","BTJ",  // Jakarta, Surabaya, Bandung, Semarang, Medan, Yogyakarta, Kuala Namu, Balikpapan
  ]),
  "EVA Air Points": new Set([
    "TPE","KHH","TXG","RMQ","CYI","MZG","GNE",  // Taipei Taoyuan, Kaohsiung, Taichung, Taitung, Chiayi, Meizhou, Guangzhou
  ]),
  "Asiana Airlines Club": new Set([
    "ICN","GMP","CJU","PUS","TAE","CJJ","MWX","USN","KWJ",  // Seoul Incheon/Gimpo, Jeju, Busan, Daegu, Cheongju, Muan, Ulsan, Gwangju
  ]),
};

// ─── Accessibility penalty ────────────────────────────────────────────────────

const ACCESSIBILITY_MULTIPLIER: Record<1 | 2 | 3, number> = {
  1: 1.0,
  2: 1.1,
  3: 1.8,   // score-3 programs pushed well down the list — they're shown for users
             // who already hold those miles, not as headline recommendations
};

export function accessibilityPenalty(programName: string): number {
  const score = PROGRAMS_BY_NAME[programName]?.accessibilityScore ?? 2;
  return ACCESSIBILITY_MULTIPLIER[score];
}

// ─── Transfer synthesis ───────────────────────────────────────────────────────

export function synthesizeTransferOptions(
  milesOptions: MilesOption[],
  bonusTransfers: TransferBonusRecord[],
  flight: {
    from: string;
    to: string;
    totalPrice: number;
    airlines: string[];
    cabin: Cabin;
    tripType: TripType;
    passengers: number;
  },
  effectivePrices: Map<string, number>,
): MilesOption[] {
  const { from, to, totalPrice: cashTotal, airlines, cabin, tripType, passengers } = flight;
  const newOptions: MilesOption[] = [];
  const originZone = getZone(from) ?? undefined;
  const destZone = getZone(to) ?? undefined;
  const operatingAirline = airlines[0] ?? "";

  // When using zone fallback, allow all transfer bonuses that target any program
  const programNames = new Set(milesOptions.map((p) => p.program));

  // Middle-East hub programs are only relevant when Middle East is involved.
  // On intra-Europe routes (MAD→BCN, CDG→LHR, etc.) Emirates/Etihad/Qatar
  // only appear via long-haul hub connections (5h+ for a 1h flight) — misleading.
  const MIDDLE_EAST_HUB_PROGRAMS = new Set([
    "Emirates Skywards",
    "Etihad Guest",
    "Qatar Privilege Club",
  ]);

  for (const bonus of bonusTransfers) {
    if (!programNames.has(bonus.to)) continue;
    if (!originZone || !destZone) continue;
    // Skip Gulf hub programs on non-Middle-East routes — they can only fly via DXB/AUH/DOH
    // which is never optimal for routes not involving the Gulf.
    // Extended beyond intra-Europe: e.g. Amex MR → Emirates Skywards on NRT→LAX is never
    // the best use of points — the redemption would require a DXB connection.
    if (MIDDLE_EAST_HUB_PROGRAMS.has(bonus.to) &&
        originZone !== "MIDDLE_EAST" && destZone !== "MIDDLE_EAST") continue;

    // Always use the program's own airline for transfer taxes.
    // operatingAirline may be a different carrier (e.g. Air Senegal on a
    // DSS-CDG flight) — using it would give wrong tax figures.
    const airlineForTaxes = PROGRAM_TO_AIRLINE[bonus.to] ?? operatingAirline;

    const { miles: destMiles, source } = getMilesRequired(bonus.to, originZone, destZone, cabin, tripType, passengers);
    const ratio = getEffectiveRatio(bonus);
    const sourceMiles = Math.ceil(destMiles / ratio);
    const taxes = getAwardTaxesForTransfer(airlineForTaxes, cabin, passengers, from, to, originZone, destZone)
      * (tripType === "roundtrip" ? 2 : 1);

    const promoApplied = bonus.promoRatio
      ? `${bonus.from} bonus ${Math.round((ratio - 1) * 100)}%`
      : undefined;

    const opt = buildOption(
      "TRANSFER",
      bonus.to,
      bonus.from,
      airlineForTaxes,
      sourceMiles,
      source,
      taxes,
      cashTotal,
      effectivePrices,
    );
    if (promoApplied) {
      opt.promoApplied = promoApplied;
      opt.explanation = buildOptionExplanation("TRANSFER", bonus.to, bonus.from, sourceMiles, taxes, promoApplied);
    }
    newOptions.push(opt);
  }

  return newOptions;
}

// ─── Dynamic global options ──────────────────────────────────────────────────

export function synthesizeDynamicOptions(
  milesOptions: MilesOption[],
  flight: {
    from: string;
    to: string;
    totalPrice: number;
    airlines: string[];
    cabin: Cabin;
    tripType: TripType;
    passengers: number;
  },
  effectivePrices: Map<string, number>,
): MilesOption[] {
  const { from, to, totalPrice: cashTotal, airlines, cabin, tripType, passengers } = flight;
  const newOptions: MilesOption[] = [];
  const originZone = getZone(from) ?? undefined;
  const destZone = getZone(to) ?? undefined;
  const operatingAirline = airlines[0] ?? "";
  const operatingAlliance = ALLIANCES[operatingAirline] ?? null;

  // Pre-compute airport coordinates (used for dynamic global options)
  const fromAirport = AIRPORTS_BY_CODE.get(from);
  const toAirport = AIRPORTS_BY_CODE.get(to);

  if (!fromAirport || !toAirport) {
    return newOptions;
  }

  const cabinMap: Record<Cabin, CabinClass> = {
    economy: "economy", premium: "premium_economy", business: "business", first: "first"
  };
  const dynamicCabin = cabinMap[cabin];

  // Only add dynamic options for programs NOT already covered by hardcoded charts
  const coveredPrograms = new Set(milesOptions.map(o => o.program));

  for (const prog of GLOBAL_PROGRAMS) {
    if (prog.isBookable === false) continue;
    if (coveredPrograms.has(prog.name)) continue;

    // Skip programs where the airline doesn't match alliance of operating airline
    // (they wouldn't have award space on this airline)
    // Note: operatingAlliance already computed above — re-use it, no re-declare.
    if (
      operatingAirline &&
      operatingAlliance &&
      operatingAlliance !== "Independent" &&
      prog.alliance !== operatingAlliance &&
      prog.alliance !== "Independent"
    ) continue;

    // Extended guard for Independent or unknown-alliance operating carriers: require at least
    // one airline in the full list to belong to the program's alliance before adding via
    // dynamic estimation. Without this, Iberia Avios appears on Air Senegal DSS→CDG because
    // Air Senegal is Independent → the first check above doesn't fire → Iberia gets estimated
    // as valid when no Oneworld metal exists. Same logic applies to unknown-alliance carriers
    // like Fiji Airways — prevents Delta SkyMiles from leaking onto SIN→LAX via dynamic path.
    if (
      operatingAirline && // airline is known
      (!operatingAlliance || operatingAlliance === "Independent") &&
      prog.alliance !== "Independent" &&
      !airlines.some((a) => ALLIANCES[a] === prog.alliance)
    ) continue;

    // Strict regional filter: exclude programs whose airlines don't serve these zones.
    // Prevents showing Air India on MIA-GRU, Korean Air on SA routes, etc.
    // IMPORTANT: declared at module level (DYNAMIC_PROGRAM_SERVED_ZONES) — NOT inside this loop.
    const servedZones = DYNAMIC_PROGRAM_SERVED_ZONES[prog.name];
    if (servedZones && originZone && destZone) {
      if (!servedZones.includes(originZone) || !servedZones.includes(destZone)) continue;
    }

    // Home-airport filter: some programs are only relevant when at least one
    // endpoint is in the airline's home country. Without this, Air India
    // appears on NRT→LAX and SIN→LAX (Star Alliance match) even though no
    // India connection exists — which misleads users.
    // IMPORTANT: declared at module level (DYNAMIC_PROGRAM_HOME_AIRPORTS) — NOT inside this loop.
    const homeAirports = DYNAMIC_PROGRAM_HOME_AIRPORTS[prog.name];
    if (homeAirports && !homeAirports.has(from) && !homeAirports.has(to)) continue;

    // Score-3 "Independent" programs (Hainan, niche carriers) have no partner
    // networks — they can only book their own airline's flights.
    // Only show them when the operating airline IS the program's own airline.
    const isRestrictedIndependent =
      prog.alliance === "Independent" &&
      (PROGRAMS_BY_NAME[prog.name]?.accessibilityScore ?? 2) === 3;
    if (isRestrictedIndependent && operatingAirline && operatingAirline !== prog.airline) continue;

    if (!originZone || !destZone) continue;

    const estimate = estimateMilesRequired(
      prog.name,
      prog.alliance,
      fromAirport.lat, fromAirport.lon,
      toAirport.lat, toAirport.lon,
      dynamicCabin,
      tripType,
      passengers,
      originZone,
      destZone,
    );

    // Compute taxes: route+airline based, RT-aware
    const taxes = getAwardTaxes(prog.airline, cabin, passengers, from, to, originZone, destZone)
      * (tripType === "roundtrip" ? 2 : 1);

    // Market value of miles — constant per program, no contextual adjustment
    const baseCents = effectivePrices.get(prog.name) ?? prog.marketValueCents;
    const valuePerMile = baseCents;
    const milesCost = roundPrice((estimate.milesRequired * valuePerMile) / 100);
    const totalMilesCost = roundPrice(milesCost + taxes);
    const savings = roundPrice(cashTotal - totalMilesCost);

    // Only add if it's potentially interesting (not way more expensive than cash)
    if (totalMilesCost > cashTotal * 1.5) continue;

    newOptions.push({
      type: "ALLIANCE",
      program: prog.name,
      via: undefined,
      operatingAirline: prog.airline,
      milesRequired: estimate.milesRequired,
      taxes,
      valuePerMile,
      milesCost,
      totalMilesCost,
      savings,
      confidence: "LOW",
      explanation: buildOptionExplanation("ALLIANCE", prog.name, undefined, estimate.milesRequired, taxes, undefined),
      isBestDeal: false,
      chartSource: "ESTIMATE",
    });
  }

  return newOptions;
}

// ─── Acquisition synthesis ───────────────────────────────────────────────────

export function synthesizeAcquisitionOptions(
  sortedForAcquisition: MilesOption[],
  cashTotal: number,
  _effectivePrices: Map<string, number>,
): MilesOption[] {
  const newOptions: MilesOption[] = [];

  for (const opt of sortedForAcquisition) {
    const acquisition = calculateAcquisitionCost(opt.program, opt.milesRequired);
    if (!acquisition.cheapest) continue;

    const totalAcquisitionCost = acquisition.cheapest.costUsd + opt.taxes;

    // Only suggest acquisition if it's cheaper than cash
    if (totalAcquisitionCost >= cashTotal) continue;

    // Don't duplicate if we already have a better option for this program
    const existingForProgram = sortedForAcquisition.find(
      o => o.program === opt.program && o.via === `Achat ${acquisition.cheapest!.source}`
    );
    if (existingForProgram && existingForProgram.totalMilesCost <= totalAcquisitionCost) continue;

    newOptions.push({
      type: "TRANSFER",
      program: opt.program,
      via: `Achat ${acquisition.cheapest.source}`,
      operatingAirline: opt.operatingAirline,
      milesRequired: opt.milesRequired,
      taxes: opt.taxes,
      valuePerMile: roundPrice((acquisition.cheapest.costUsd / opt.milesRequired) * 100),
      milesCost: acquisition.cheapest.costUsd,
      totalMilesCost: totalAcquisitionCost,
      savings: roundPrice(cashTotal - totalAcquisitionCost),
      confidence: "MEDIUM",
      explanation: buildOptionExplanation("TRANSFER", opt.program, `Achat ${acquisition.cheapest.source}`, opt.milesRequired, opt.taxes, undefined),
      isBestDeal: false,
      chartSource: opt.chartSource,
    });
  }

  return newOptions;
}

// ─── Zone-aware filtering ────────────────────────────────────────────────────

export function filterZoneAwareOptions(
  milesOptions: MilesOption[],
  originZone: string | undefined,
  destZone: string | undefined,
): MilesOption[] {
  // Prevents geographically irrelevant programs from surfacing on routes they
  // have no operational connection to. Applied BEFORE deduplication so phantom
  // entries don't influence the bestOption ranking.
  //
  // Gulf hub programs (EK/EY/QR): only meaningful when a Middle East endpoint
  // is involved. On NRT→LAX, TP sometimes returns EK codeshare results —
  // this would inject Emirates Skywards as a DIRECT match. On routes like
  // BKK→CDG, Etihad would appear as an ALLIANCE match via Lufthansa Star Alliance.
  // Both are misleading: the redemption requires a 5–10h DXB/AUH/DOH detour.
  const REQUIRES_MIDDLE_EAST_ENDPOINT = new Set([
    "Emirates Skywards",
    "Etihad Guest",
    "Qatar Privilege Club",
  ]);
  // Asia-Pacific flagship programs: ALLIANCE matches only make sense when
  // Asia is an endpoint. JAL appearing on CMN→CDG (via RAM/Oneworld) or
  // Cathay Pacific on MAD→BCN (via Iberia/Oneworld) misleads users — the
  // redemption would require a routing via Asia. DIRECT matches are kept
  // (JAL DIRECT on NRT→LAX = JAL actually operates the flight → valid).
  const REQUIRES_ASIA_ENDPOINT = new Set([
    "Japan Airlines Mileage Bank",
    "ANA Mileage Club",
    "Cathay Pacific Asia Miles",
  ]);
  // Ethiopian ShebaMiles: primarily useful on ADD (Addis Ababa) routes.
  // On DXB→LHR it can appear via Star Alliance (Lufthansa) ALLIANCE match —
  // but Ethiopian doesn't operate that corridor and the detour via ADD is impractical.
  const REQUIRES_AFRICA_ENDPOINT = new Set([
    "Ethiopian ShebaMiles",
  ]);

  return milesOptions.filter((opt) => {
    // Gulf programs: filter all appearances when no Middle East endpoint
    if (
      REQUIRES_MIDDLE_EAST_ENDPOINT.has(opt.program) &&
      originZone !== "MIDDLE_EAST" &&
      destZone !== "MIDDLE_EAST"
    ) return false;
    // Asia-Pacific programs: filter ALLIANCE appearances when no Asia endpoint
    // DIRECT matches are preserved (e.g. JAL DIRECT on NRT→LAX)
    if (
      REQUIRES_ASIA_ENDPOINT.has(opt.program) &&
      opt.type === "ALLIANCE" &&
      originZone !== "ASIA" &&
      destZone !== "ASIA"
    ) return false;
    // Ethiopian: filter ALLIANCE appearances when no Africa endpoint
    if (
      REQUIRES_AFRICA_ENDPOINT.has(opt.program) &&
      opt.type === "ALLIANCE" &&
      !(originZone ?? "").startsWith("AFRICA_") &&
      !(destZone ?? "").startsWith("AFRICA_")
    ) return false;
    // TODO: LATAM Pass / Aeromexico filtering is too aggressive
    // It blocks valid codeshare redemptions on non-Americas routes.
    // Should instead: only filter if LATAM has ZERO presence on this route.
    // For now: commented out to let codeshare options surface.
    // Revisit: implement presence-check (if no LATAM/Aeromexico flights found,
    // then filter Alliance options; otherwise keep them visible).
    // if (
    //   (opt.program === "LATAM Pass" || opt.program === "Aeromexico Club Premier") &&
    //   opt.type === "ALLIANCE" &&
    //   originZone !== "SOUTH_AMERICA" && destZone !== "SOUTH_AMERICA" &&
    //   originZone !== "NORTH_AMERICA" && destZone !== "NORTH_AMERICA"
    // ) return false;
    return true;
  });
}

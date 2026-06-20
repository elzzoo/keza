import "server-only";
import { PriceBaseline } from "@/lib/mlPipeline";
import { BalanceResult } from "@/lib/balanceSync";

export interface DealScore {
  route: string;
  currentPrice: number;
  historicalAvg: number;
  discount: number; // percentage
  score: number; // 0-1
  hasSufficientMiles: boolean;
  recommendation: string;
}

export const DEAL_THRESHOLD = 0.7; // Score >= 0.7 is "good deal"
export const DISCOUNT_THRESHOLD = 0.85; // Price <= 85% of avg = deal

export function scoreRoute(
  currentPrice: number,
  baseline: PriceBaseline | null,
  userBalances: BalanceResult[],
  route: string,
  cabin: string = "economy"
): number {
  if (!baseline) return 0;

  // Normalize price by cabin
  const cabinMultiplier = getCabinMultiplier(cabin);
  const adjustedBaseline = baseline.avg * cabinMultiplier;

  // Price deviation from baseline (negative = discount)
  // For a 26.7% discount: (750 - 550) / 750 = 0.267
  const deviation = (adjustedBaseline - currentPrice) / adjustedBaseline;

  // Base score: 0-1 based on discount
  // Using 2.5x multiplier: 0.267 * 2.5 = 0.667, capped at 1
  let score = Math.max(0, Math.min(1, deviation * 2.5));

  // Bonus if user has miles in relevant programs (20% boost)
  const [from, to] = route.split("-");
  const routePrograms = getRouteProgramsForUser(route, from, to);

  if (routePrograms.length > 0) {
    const hasMiles = userBalances.some((b) =>
      routePrograms.some((p) => p.program === b.program)
    );

    if (hasMiles) {
      score = Math.min(1, score + 0.25); // Add flat 25% boost if has miles
    }
  }

  // Penalty for high volatility
  if (baseline.stdDev > baseline.avg * 0.15) {
    // >15% volatility
    score = score * 0.9;
  }

  return Math.min(1, Math.max(0, score));
}

export function isGoodDeal(
  score: number,
  currentPrice: number,
  baseline: PriceBaseline
): boolean {
  const discountPercentage = (baseline.avg - currentPrice) / baseline.avg;
  return score >= DEAL_THRESHOLD || discountPercentage >= 0.15;
}

export function getDealRecommendation(score: number): string {
  if (score >= 0.85) return "Exceptional deal! Book immediately.";
  if (score >= 0.75) return "Great deal for you!";
  if (score >= 0.65) return "Good price.";
  if (score >= 0.5) return "Fair price.";
  return "Not a deal.";
}

function getRouteProgramsForUser(
  route: string,
  from: string,
  to: string
): { program: string; airline: string }[] {
  // Look up which programs service this route
  // This is a mapping of routes to their primary airline programs
  const routeProgramMap: Record<string, { program: string; airline: string }[]> = {
    "SIN-LAX": [
      {
        program: "Singapore KrisFlyer",
        airline: "Singapore Airlines",
      },
    ],
    "SIN-JFK": [
      {
        program: "Singapore KrisFlyer",
        airline: "Singapore Airlines",
      },
    ],
    "SIN-SFO": [
      {
        program: "Singapore KrisFlyer",
        airline: "Singapore Airlines",
      },
    ],
    "SIN-LHR": [
      {
        program: "Singapore KrisFlyer",
        airline: "Singapore Airlines",
      },
    ],
    "NRT-LAX": [
      { program: "ANA Mileage Club", airline: "All Nippon Airways" },
      {
        program: "Japan Airlines Mileage Bank",
        airline: "Japan Airlines",
      },
    ],
    "NRT-JFK": [
      { program: "ANA Mileage Club", airline: "All Nippon Airways" },
      {
        program: "Japan Airlines Mileage Bank",
        airline: "Japan Airlines",
      },
    ],
    "NRT-SFO": [
      { program: "ANA Mileage Club", airline: "All Nippon Airways" },
      {
        program: "Japan Airlines Mileage Bank",
        airline: "Japan Airlines",
      },
    ],
    "NRT-ORD": [
      { program: "ANA Mileage Club", airline: "All Nippon Airways" },
      {
        program: "Japan Airlines Mileage Bank",
        airline: "Japan Airlines",
      },
    ],
    "HND-LAX": [
      { program: "ANA Mileage Club", airline: "All Nippon Airways" },
      {
        program: "Japan Airlines Mileage Bank",
        airline: "Japan Airlines",
      },
    ],
    "DXB-LHR": [
      {
        program: "Emirates Skywards",
        airline: "Emirates",
      },
    ],
    "DXB-JFK": [
      {
        program: "Emirates Skywards",
        airline: "Emirates",
      },
    ],
    "DXB-CDG": [
      {
        program: "Emirates Skywards",
        airline: "Emirates",
      },
    ],
    "DXB-FRA": [
      {
        program: "Emirates Skywards",
        airline: "Emirates",
      },
    ],
    "DXB-LAX": [
      {
        program: "Emirates Skywards",
        airline: "Emirates",
      },
    ],
    "DXB-SYD": [
      {
        program: "Emirates Skywards",
        airline: "Emirates",
      },
    ],
    "DXB-BKK": [
      {
        program: "Emirates Skywards",
        airline: "Emirates",
      },
    ],
  };

  return routeProgramMap[route] ?? [];
}

export function getCabinMultiplier(cabin: string): number {
  const cabinLower = cabin.toLowerCase();
  const multipliers: Record<string, number> = {
    economy: 1.0,
    premium_economy: 1.4,
    premium: 1.4,
    business: 2.2,
    first: 3.5,
  };
  return multipliers[cabinLower] ?? 1.0;
}

/**
 * Recommendation Engine — Best value options, alternatives, and timing advice
 * Provides "You should consider these options" style recommendations
 */

import type { FlightResult } from "@/lib/engine";
import { getPriceHistory } from "@/lib/priceHistoryRedis";

export interface Recommendation {
  type: "BEST_VALUE" | "ALTERNATIVE_ROUTE" | "TIMING" | "PROGRAM_SWITCH";
  title: string;
  description: string;
  action: string;
  savings?: number;
  savingsPercent?: number;
  daysUntilBetter?: number;
}

// ── Best value recommendations ──────────────────────────────────────────────────
/**
 * Find top 3 best-value flights from the search results
 * Filtered by CPP (cost per point) for miles users
 */
export async function getbestValueRecommendations(
  results: FlightResult[],
  _userPrograms: string[] = [],
  lang: "fr" | "en" = "en"
): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = [];

  // Filter to miles-recommended results
  const milesRecommendations = results
    .filter((r) => r.recommendation === "USE_MILES" && r.bestOption && r.savings > 0)
    .sort((a, b) => b.savings - a.savings)
    .slice(0, 3);

  for (const flight of milesRecommendations) {
    if (!flight.bestOption) continue;

    const savings = flight.savings;
    const savingsPercent = flight.cashCost > 0 ? (savings / flight.cashCost) * 100 : 0;

    recommendations.push({
      type: "BEST_VALUE",
      title: lang === "fr" ? "Meilleure valeur aux miles" : "Best miles value",
      description: lang === "fr"
        ? `${flight.airlines[0]} economise ${flight.bestOption.program}`
        : `${flight.airlines[0]} save with ${flight.bestOption.program}`,
      action: lang === "fr" ? "Voir l'option" : "View option",
      savings: Math.round(savings),
      savingsPercent: Math.round(savingsPercent),
    });
  }

  return recommendations;
}

// ── Alternative routes ─────────────────────────────────────────────────────────
/**
 * Find alternative routes with better CPP for the same origin/destination pair
 * E.g., "Consider connecting via CDG instead of direct to save"
 */
export async function getAlternativeRouteRecommendations(
  results: FlightResult[],
  lang: "fr" | "en" = "en"
): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = [];

  if (results.length < 2) return recommendations;

  // Group by stops, find cheapest in each group
  const directFlights = results.filter((r) => (r.stops ?? 0) === 0);
  const oneStopFlights = results.filter((r) => (r.stops ?? 0) === 1);

  if (directFlights.length > 0 && oneStopFlights.length > 0) {
    const directCheapest = directFlights.reduce((prev, current) =>
      current.cashCost < prev.cashCost ? current : prev
    );
    const oneStopCheapest = oneStopFlights.reduce((prev, current) =>
      current.cashCost < prev.cashCost ? current : prev
    );

    const savings = directCheapest.cashCost - oneStopCheapest.cashCost;
    if (savings > 20) {
      recommendations.push({
        type: "ALTERNATIVE_ROUTE",
        title: lang === "fr" ? "Option moins chère avec escale" : "Cheaper option with connection",
        description: lang === "fr"
          ? `Vol avec escale economise ${savings} USD par personne`
          : `One-stop flight saves $${Math.round(savings)} per person`,
        action: lang === "fr" ? "Voir les vols avec escale" : "View one-stop flights",
        savings: Math.round(savings),
      });
    }
  }

  return recommendations;
}

// ── Pricing trend analysis ─────────────────────────────────────────────────────
/**
 * Analyze 7-day price trend to recommend "book now vs later"
 * Based on historical data
 */
export async function getTimingRecommendation(
  from: string,
  to: string,
  currentPrice: number,
  lang: "fr" | "en" = "en"
): Promise<Recommendation | null> {
  try {
    const history = await getPriceHistory(from, to, 7);
    if (history.length < 3) return null;

    // Calculate trend
    const latest = history[history.length - 1]?.price ?? 0;
    const weekAgo = history[0]?.price ?? 0;

    if (weekAgo === 0) return null;

    const trendPercent = ((latest - weekAgo) / weekAgo) * 100;

    // If prices are rising, recommend booking now
    if (trendPercent > 10) {
      return {
        type: "TIMING",
        title: lang === "fr" ? "Prix en hausse" : "Prices rising",
        description: lang === "fr"
          ? `Les prix sur cette route ont augmente de ${trendPercent.toFixed(0)}% cette semaine`
          : `Prices on this route increased ${trendPercent.toFixed(0)}% this week`,
        action: lang === "fr" ? "Réserver maintenant" : "Book now",
      };
    }

    // If prices are falling, recommend waiting
    if (trendPercent < -10) {
      const estimatedSavings = Math.round(currentPrice * (Math.abs(trendPercent) / 100));
      return {
        type: "TIMING",
        title: lang === "fr" ? "Prix en baisse" : "Prices falling",
        description: lang === "fr"
          ? `Les prix baissent. Vous economiseriez ~${estimatedSavings} USD en attendant`
          : `Prices are falling. You could save ~$${estimatedSavings} by waiting`,
        action: lang === "fr" ? "Attendre" : "Wait",
        savings: estimatedSavings,
      };
    }

    return null;
  } catch {
    return null;
  }
}

// ── Program switching ──────────────────────────────────────────────────────────
/**
 * Recommend switching loyalty programs if a better option is available
 * E.g., "Switch to Flying Blue for this route and save 50K miles"
 */
export async function getProgramSwitchRecommendations(
  flight: FlightResult,
  lang: "fr" | "en" = "en"
): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = [];

  if (!flight.milesOptions || flight.milesOptions.length < 2) return recommendations;

  // Find if there's a significantly cheaper miles option (20%+)
  const cheapest = flight.milesOptions[0];
  const alternativeOptions = flight.milesOptions.slice(1, 3);

  for (const alt of alternativeOptions) {
    if (!cheapest || !alt) continue;

    const milesSaved = cheapest.milesRequired - alt.milesRequired;
    const savePercent = cheapest.milesRequired > 0 ? (milesSaved / cheapest.milesRequired) * 100 : 0;

    if (milesSaved > 5000 && savePercent > 20) {
      recommendations.push({
        type: "PROGRAM_SWITCH",
        title: lang === "fr" ? "Programme moins cher" : "Cheaper program available",
        description: lang === "fr"
          ? `${alt.program} economise ${milesSaved.toLocaleString()} miles (${savePercent.toFixed(0)}%)`
          : `${alt.program} saves ${milesSaved.toLocaleString()} miles (${savePercent.toFixed(0)}%)`,
        action: lang === "fr" ? "Voir l'option" : "View option",
      });
    }
  }

  return recommendations;
}

// ── Get all recommendations ────────────────────────────────────────────────────
/**
 * Comprehensive recommendation engine
 * Combines all recommendation types for a given search result
 */
export async function getAllRecommendations(
  results: FlightResult[],
  from: string,
  to: string,
  userPrograms: string[] = [],
  lang: "fr" | "en" = "en"
): Promise<Recommendation[]> {
  const allRecommendations: Recommendation[] = [];

  try {
    // Best value recommendations
    const bestValue = await getbestValueRecommendations(results, userPrograms, lang);
    allRecommendations.push(...bestValue);

    // Alternative routes
    const alternatives = await getAlternativeRouteRecommendations(results, lang);
    allRecommendations.push(...alternatives);

    // Timing recommendations
    if (results.length > 0) {
      const timing = await getTimingRecommendation(from, to, results[0].cashCost, lang);
      if (timing) allRecommendations.push(timing);
    }

    // Program switching
    if (results.length > 0) {
      const programSwitch = await getProgramSwitchRecommendations(results[0], lang);
      allRecommendations.push(...programSwitch);
    }
  } catch {
    // Never crash on recommendations
  }

  // Limit to 3-4 recommendations
  return allRecommendations.slice(0, 4);
}

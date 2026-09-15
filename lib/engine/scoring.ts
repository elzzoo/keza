import { ENABLE_P5_2_SOFT_LAUNCH, P5_2_BASELINE_ONLY } from "../config";
import { logWarn } from "../logger";
import { scoreFlights } from "../scoring/scoringEngine";
import type { FlightResult } from "./types";

interface ApplyP52ScoringOptions {
  skipIfAlreadyScored?: boolean;
  logPrefix?: string;
}

export async function applyP52Scoring(
  results: FlightResult[],
  options: ApplyP52ScoringOptions = {},
): Promise<FlightResult[]> {
  if (!ENABLE_P5_2_SOFT_LAUNCH || results.length === 0) return results;
  if (options.skipIfAlreadyScored && results[0]?.scoringResult) return results;

  try {
    const scoredResults = await scoreFlights(results, "", new Date());

    if (!P5_2_BASELINE_ONLY) {
      scoredResults.sort((a, b) => {
        const scoreA = a.scoringResult?.overallScore ?? 0;
        const scoreB = b.scoringResult?.overallScore ?? 0;
        return scoreB - scoreA;
      });
    }

    return scoredResults;
  } catch (err) {
    const prefix = options.logPrefix ?? "[engine/scoring]";
    logWarn(`${prefix} P5.2 scoring failed, keeping cost-based ranking: ${String(err)}`);
    return results;
  }
}

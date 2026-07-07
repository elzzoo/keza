/**
 * Daily CPP statistics calculation cron job
 * Runs at midnight UTC to calculate percentiles for all program/route pairs
 * Updates the cpp_percentiles cache used during search result enrichment
 */

import { NextRequest, NextResponse } from "next/server";
import { hasCronSecret } from "@/lib/auth";
import { rateLimitResponse } from "@/lib/ratelimit";
import * as Sentry from "@sentry/nextjs";
import { logError, logWarn } from "@/lib/logger";
import { calculateCppPercentiles, storePercentiles } from "@/lib/valueScoring";
import { redis } from "@/lib/redis";

// Popular routes with their primary loyalty programs
const ROUTE_PROGRAMS = [
  // [from, to, programs[]]
  ["DSS", "CDG", ["Flying Blue", "Air Senegal"]],
  ["ABJ", "CDG", ["Flying Blue"]],
  ["LOS", "LHR", ["British Airways Avios"]],
  ["CMN", "CDG", ["Royal Air Maroc Safar", "Flying Blue"]],
  ["NBO", "CDG", ["Flying Blue", "Kenya Airways Flying Blue"]],
  ["JFK", "LHR", ["British Airways Avios", "American AAdvantage"]],
  ["CDG", "JFK", ["Flying Blue", "American AAdvantage"]],
  ["LAX", "CDG", ["Flying Blue"]],
  ["JFK", "AMS", ["Flying Blue"]],
  ["LHR", "SIN", ["Singapore KrisFlyer", "British Airways Avios"]],
  ["CDG", "NRT", ["Flying Blue", "ANA Mileage Club"]],
  ["LHR", "DXB", ["Emirates Skywards", "British Airways Avios"]],
  ["DXB", "LHR", ["Emirates Skywards"]],
  ["SIN", "SYD", ["Singapore KrisFlyer"]],
  ["MIA", "BOG", ["American AAdvantage"]],
  ["GRU", "LHR", ["LATAM Pass", "British Airways Avios"]],
  ["LAX", "NRT", ["ANA Mileage Club"]],
  ["BKK", "LHR", ["Thai Airways Royal Orchid Plus", "British Airways Avios"]],
];

export async function GET(req: NextRequest) {
  const limited = await rateLimitResponse(req, {
    namespace: "api:cron:cpp-stats",
    limit: 5,
    windowSeconds: 300,
  });
  if (limited) return limited;

  if (!hasCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Sentry.withMonitor("cron-cpp-stats", async () => {
    try {
      let processed = 0;
      let errors: string[] = [];

      // Process each route-program combination
      for (const [from, to, programs] of ROUTE_PROGRAMS) {
        for (const program of programs) {
          try {
            // Calculate percentiles from accumulated observations
            const percentiles = await calculateCppPercentiles(from, to, program);

            if (percentiles) {
              // Store calculated percentiles for fast lookup during search
              await storePercentiles(from, to, program, percentiles);
              processed++;
            }
          } catch (err) {
            errors.push(`${from}-${to}/${program}: ${(err as Error).message}`);
          }
        }
      }

      // Cleanup: Remove CPP observations older than 30 days
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);
        // Note: Redis doesn't have built-in date-based cleanup for sorted sets
        // The expire() call in recordCppObservation handles this
      } catch (err) {
        logWarn("[cron/cpp-stats] Cleanup error", err as Error);
      }

      return NextResponse.json({
        processed,
        total: ROUTE_PROGRAMS.length * 3, // Approximate
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logError("[api/cron/cpp-stats]", err);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  }, { schedule: { type: "crontab", value: "0 0 * * *" } }); // Midnight UTC daily
}

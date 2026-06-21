import { NextRequest, NextResponse } from "next/server";
import { hasCronSecret } from "@/lib/auth";
import { rateLimitResponse } from "@/lib/ratelimit";
import { getRouteBaseline } from "@/lib/mlPipeline";
import { getCachedBalances } from "@/lib/balanceSync";
import { scoreRoute, isGoodDeal, DealScore } from "@/lib/dealScorer";
import { logError } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { safeSet } from "@/lib/redis";

export async function GET(req: NextRequest) {
  const limited = await rateLimitResponse(req, {
    namespace: "api:cron:deal-recommendations",
    limit: 5,
    windowSeconds: 300,
  });
  if (limited) return limited;

  if (!hasCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Sentry.withMonitor("cron-deal-recommendations", async () => {
    try {
      const routes = await getAllRoutes(); // Get all active routes
      const deals: Map<string, DealScore[]> = new Map(); // user -> deals
      let processed = 0;

      for (const route of routes) {
        try {
          // Get baseline for this route
          const baseline = await getRouteBaseline(route);
          if (!baseline) continue;

          // Get current prices
          const prices = await getCurrentPrices(route);
          if (!prices || prices.length === 0) continue;

          const cheapestPrice = Math.min(...prices);

          // For each user, score this deal
          const allUsers = await getAllUserEmails();
          for (const userEmail of allUsers) {
            const balances = await getCachedBalances(userEmail);
            const score = scoreRoute(
              cheapestPrice,
              baseline,
              balances,
              route
            );

            if (isGoodDeal(score, cheapestPrice, baseline)) {
              if (!deals.has(userEmail)) {
                deals.set(userEmail, []);
              }
              deals.get(userEmail)!.push({
                route,
                currentPrice: cheapestPrice,
                historicalAvg: baseline.avg,
                discount:
                  ((baseline.avg - cheapestPrice) / baseline.avg) * 100,
                score,
                hasSufficientMiles: balances.some(
                  (b) =>
                    b.program ===
                    getRouteProgramsForUser(route)[0]?.program
                ),
                recommendation: `Score: ${score.toFixed(2)}`,
              });
            }
          }

          processed++;
        } catch (err) {
          logError(`Failed to score route ${route}`, err);
        }
      }

      // Store top 3 deals per user in Redis
      for (const [userEmail, userDeals] of deals) {
        const topDeals = userDeals
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);
        await safeSet(
          `keza:deals:${userEmail}`,
          JSON.stringify(topDeals),
          { ex: 24 * 60 * 60 } // 24-hour TTL
        );
      }

      return NextResponse.json({
        success: true,
        processed,
        usersWithDeals: deals.size,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logError("Cron deal-recommendations failed", err);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}

async function getAllUserEmails(): Promise<string[]> {
  // Fetch all registered user emails
  // Placeholder: would query database
  return [];
}

async function getAllRoutes(): Promise<string[]> {
  // Return all active routes in system
  return ["SIN-LAX", "NRT-LAX", "DXB-LHR", "CDG-BKK"]; // Placeholder
}

async function getCurrentPrices(_route: string): Promise<number[]> {
  // Fetch current cheapest prices for route
  return [];
}

function getRouteProgramsForUser(
  route: string
): { program: string; airline: string }[] {
  const routeProgramMap: Record<
    string,
    { program: string; airline: string }[]
  > = {
    "SIN-LAX": [{ program: "Singapore KrisFlyer", airline: "Singapore Airlines" }],
    "NRT-LAX": [{ program: "ANA Mileage Club", airline: "All Nippon Airways" }],
    "DXB-LHR": [{ program: "Emirates Skywards", airline: "Emirates" }],
    "CDG-BKK": [{ program: "Flying Blue", airline: "Air France" }],
  };
  return routeProgramMap[route] ?? [];
}

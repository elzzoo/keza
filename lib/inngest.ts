import { Inngest } from "inngest";
import { updateRatesInCache } from "@/lib/exchange-rates";

export const inngest = new Inngest({
  id: "keza",
  name: "KEZA",
});

/**
 * Inngest events and functions for orchestrating background jobs.
 *
 * Event-driven architecture:
 * - Long-running crons are invoked by Inngest, not Vercel Cron directly
 * - Retry: 3x with exponential backoff (2s, 10s, 30s)
 * - Timeout: 60s soft (warn), 120s hard (kill)
 * - Monitoring: Slack/Sentry alerts on repeated failures
 */

export const Events = {
  DAILY_REFRESH: "keza/daily.refresh",
  TRIAL_REMINDER: "keza/trial.reminder",
  DIGEST_ALERT: "keza/digest.alert",
  SEAT_ALERT: "keza/seat.alert",
} as const;

/**
 * Exchange rate update cron job
 *
 * Runs every 6 hours to fetch and cache the latest USD exchange rates.
 * Uses exchangerate-api.com as the primary data source.
 * Includes retry logic (max 3 attempts) with exponential backoff.
 *
 * @returns Success status with count of rates updated
 */
export const updateExchangeRates = inngest.createFunction(
  {
    id: "update-exchange-rates",
    triggers: [{ cron: "0 */6 * * *" }], // Every 6 hours at :00 UTC
    retries: 3, // Max 3 attempts with exponential backoff
  },
  async ({ step }): Promise<{ success: boolean; ratesUpdated: number; ratesFetched: number }> => {
    const rates = await step.run("fetch-rates", async () => {
      try {
        const response = await fetch(
          "https://api.exchangerate-api.com/v4/latest/USD"
        );

        if (!response.ok) {
          throw new Error(
            `exchangerate-api returned ${response.status}: ${response.statusText}`
          );
        }

        const data = await response.json();

        if (!data.rates || typeof data.rates !== "object") {
          throw new Error("Invalid rates format from API");
        }

        return data.rates as Record<string, number>;
      } catch (error) {
        console.error("[Inngest] Failed to fetch exchange rates:", error);
        // Return empty object on fetch failure — Redis will try again in 6h
        return {};
      }
    });

    // Only update cache if we got non-empty rates
    let updatedCount = 0;
    if (Object.keys(rates).length > 0) {
      await step.run("update-cache", async () => {
        try {
          await updateRatesInCache(rates);
          updatedCount = Object.keys(rates).length;
          console.log(`[Inngest] Updated ${updatedCount} exchange rates in cache`);
        } catch (error) {
          console.error("[Inngest] Failed to update cache:", error);
        }
      });
    }

    return {
      success: Object.keys(rates).length > 0,
      ratesUpdated: updatedCount,
      ratesFetched: Object.keys(rates).length,
    };
  }
);

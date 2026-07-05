import "server-only";
import { inngest } from "./inngest";
import { redis } from "./redis";
import { searchEngine } from "./engine";
import { sendMilesAlertEmail } from "./resend-client";
import {
  shouldFireAlert,
  updateAlertLastFired,
  type MilesAlert,
} from "./miles-alerts";

/**
 * Daily cron job that checks miles alerts and sends emails when great deals are found.
 *
 * Algorithm:
 * 1. Fetch all alerts from Redis (key pattern: keza:miles-alert:*)
 * 2. Parse each alert, group by email
 * 3. For each email and each alert:
 *    a. Check shouldFireAlert() — skip if within 24h cooldown
 *    b. Extract [from, to] from alert.route (e.g., "SIN-LAX" → ["SIN", "LAX"])
 *    c. Call searchEngine({ from, to, date: today, tripType: "ONE_WAY", cabin: "economy", passengers: 1 })
 *    d. Find best CPP for alert.program in search results
 *    e. If best CPP exists AND best CPP <= alert.thresholdCpp:
 *       - Call sendMilesAlertEmail()
 *       - Call updateAlertLastFired()
 *       - Increment emailsSent counter
 *    f. Log each step with [miles-alert] prefix
 * 4. Catch and log errors per alert (continue to next)
 * 5. Return { checked: count, sent: count }
 */
export const checkMilesAlerts = inngest.createFunction(
  {
    id: "check-miles-alerts",
    name: "Check Miles Alerts for Great Deals",
    triggers: [{ cron: "0 8 * * *" }], // 8am UTC daily
  },
  async () => {
    console.log("[miles-alert] Starting daily cron check");

    let alertsChecked = 0;
    let emailsSent = 0;
    const now = Date.now();

    try {
      // 1. Fetch all alerts from Redis
      const alertKeys = await redis.keys("keza:miles-alert:*");
      console.log(`[miles-alert] Found ${alertKeys.length} alert keys`);

      // 2. Group alerts by email
      const alertsByEmail = new Map<string, MilesAlert[]>();

      for (const key of alertKeys) {
        try {
          const alert = await redis.get<MilesAlert>(key);
          if (!alert) {
            console.warn(`[miles-alert] Alert key expired or missing: ${key}`);
            continue;
          }

          // Group by email
          const email = alert.email;
          if (!alertsByEmail.has(email)) {
            alertsByEmail.set(email, []);
          }
          alertsByEmail.get(email)!.push(alert);
        } catch (err) {
          console.error(`[miles-alert] Error fetching alert key ${key}:`, err);
        }
      }

      // 3. Process each email and its alerts
      for (const [email, alerts] of alertsByEmail) {
        console.log(
          `[miles-alert] Processing ${alerts.length} alerts for ${email}`
        );

        for (const alert of alerts) {
          alertsChecked++;

          try {
            // 3a. Check cooldown
            const shouldFire = await shouldFireAlert(alert, now);
            if (!shouldFire) {
              console.log(
                `[miles-alert] Alert skipped (cooldown): ${alert.route} ${alert.program}`
              );
              continue;
            }

            // 3b. Extract route
            const [from, to] = alert.route.split("-");
            if (!from || !to) {
              console.error(
                `[miles-alert] Invalid route format: ${alert.route}`
              );
              continue;
            }

            console.log(
              `[miles-alert] Checking ${from}-${to} for ${alert.program}`
            );

            // 3c. Search for flights
            const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
            const searchResults = await searchEngine(
              {
                from,
                to,
                date: today,
                tripType: "oneway",
                cabin: "economy",
                passengers: 1,
              },
              `miles-alert-${alert.email}-${alert.route}`
            );

            if (!searchResults || searchResults.length === 0) {
              console.log(
                `[miles-alert] No flights found for ${from}-${to}`
              );
              continue;
            }

            console.log(
              `[miles-alert] Found ${searchResults.length} flights for ${from}-${to}`
            );

            // 3d. Find best CPP for this program
            let bestCpp: number | null = null;
            let bestFlight = null;

            for (const flight of searchResults) {
              // Look for the alert.program in milesOptions
              if (!flight.milesOptions || flight.milesOptions.length === 0) {
                continue;
              }

              for (const option of flight.milesOptions) {
                if (option.program === alert.program) {
                  // CPP = valuePerMile (already in $/mile)
                  const cpp = option.valuePerMile;

                  if (bestCpp === null || cpp < bestCpp) {
                    bestCpp = cpp;
                    bestFlight = flight;
                  }
                }
              }
            }

            // 3e. Send email if CPP matches threshold
            if (bestCpp !== null && bestCpp <= alert.thresholdCpp) {
              console.log(
                `[miles-alert] MATCH! ${alert.program} ${from}-${to} cpp=${bestCpp} <= threshold=${alert.thresholdCpp}`
              );

              try {
                await sendMilesAlertEmail({
                  email: alert.email,
                  route: alert.route,
                  program: alert.program,
                  cpp: bestCpp,
                  threshold: alert.thresholdCpp,
                  flight: bestFlight,
                });

                await updateAlertLastFired(email, alert.route, alert.program, now);
                emailsSent++;
                console.log(
                  `[miles-alert] Email sent and alert updated for ${email}`
                );
              } catch (emailErr) {
                console.error(
                  `[miles-alert] Failed to send email for ${email}:`,
                  emailErr
                );
              }
            } else {
              const cppStr =
                bestCpp !== null ? bestCpp.toFixed(4) : "not found";
              console.log(
                `[miles-alert] No match: ${alert.program} ${from}-${to} cpp=${cppStr} > threshold=${alert.thresholdCpp}`
              );
            }
          } catch (alertErr) {
            console.error(
              `[miles-alert] Error processing alert ${alert.route} ${alert.program}:`,
              alertErr
            );
            // Continue to next alert
          }
        }
      }

      console.log(
        `[miles-alert] Cron complete: checked=${alertsChecked}, sent=${emailsSent}`
      );

      return {
        checked: alertsChecked,
        sent: emailsSent,
      };
    } catch (fatalErr) {
      console.error("[miles-alert] Fatal error in cron:", fatalErr);
      throw fatalErr;
    }
  }
);

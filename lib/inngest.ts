import { Inngest } from "inngest";

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

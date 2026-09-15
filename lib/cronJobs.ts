export const DAILY_CRON_JOBS = [
  "/api/cron/miles-prices",   // 3am — recalibrate miles values from Redis observations
  "/api/cron/deals",          // 6am — refresh curated deals
  "/api/cron/promotions",     // 6:15am — apply transfer bonus promotions
  "/api/cron/digest",         // 10am — send weekly digest emails
  "/api/cron/onboarding",     // 11am — onboarding drip emails (J3/J7)
  "/api/cron/price-snapshot", // 9am — snapshot prices to history
  "/api/cron/prewarm",        // 4am — pre-warm cache for top corridors
] as const;

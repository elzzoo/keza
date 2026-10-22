# Miles valuation provenance gap (2026-10-22)

Source-level audit of GitHub `main` at `9e068c6b785f318c20cbdb8ecf7d7a4d135a905a`. The relevant local source blobs match that remote tree. No production Redis value, supplier rate, user search, or external valuation source was queried.

## Observed contracts

- `data/milesPrices.ts` contains 37 static USD-cent-per-mile estimates: 15 `HIGH`, 14 `MEDIUM`, 8 `LOW`. Every `lastUpdated` date is between 2026-04-20 and 2026-05-28, so all 37 exceed the documented 90-day freshness threshold as of 2026-10-22. The records have no source URL, sampling method, redemption route/cabin, or review evidence field. Confidence is a qualitative label, not proof of a recent check.
- The FR/EN calculator receives `MILES_PRICES` directly and now displays each record's static date and age warning (`9e068c6b`). Search instead calls `getEffectivePrices()` -> `getAllEffectivePrices()`, which prefers Redis `miles:price:{program}` and falls back to the static map. The calculator and search therefore need not use the same effective value. Production divergence was not measured.
- The daily miles-price cron first calls `recalibrate()`; it only changes a program after at least 10 observations. It then repopulates missing Redis prices from the static map and writes `miles:lastUpdated:{program}` with the current time for **every** program, whether recalibrated or merely carried forward. `getLastUpdated()` describes that timestamp as confirmation/update by cron. This key proves a cron pass, not an independent valuation review.
- `DataTrustPanel` and the programs pages derive their review month from the latest static `lastUpdated` date. They cite ThePointsGuy, NerdWallet and AwardWallet in aggregate, without a per-record citation or method in the data model. The current UI should not imply that the daily Redis timestamp makes old static estimates newly verified.

## Safe next steps

1. Separate `lastCronSeenAt`, `lastCalculatedAt` and `lastSourceReviewedAt` in the data contract. A static fallback must retain its source-review date even when copied to Redis; a calibrated value needs observation count, sample period and method.
2. Add contract tests covering no observations, fewer than 10 observations, calibrated values, and Redis failure. Keep fallback behavior until a replacement is proven.
3. Validate a small set of important programs against attributable primary program terms and actual redemption samples. Record sources, route/cabin, date and calculation before changing cent values or confidence labels. Do not advance `lastUpdated` simply to clear the warning.
4. Decide the rollout and rollback for timestamp semantics before deploying a cron/data change. This audit makes no such change.

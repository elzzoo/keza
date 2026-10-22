# Feature readiness inventory (2026-10-22)

Source-level audit of GitHub `main` at `5945c877`. This classifies the code path, not production feature-flag values or actual supplier access. No production data, user account, paid API, or cron was queried.

| Capability | Status | Evidence and release condition |
| --- | --- | --- |
| Manual miles wallet | Live | `app/portefeuille/PortefeuilleClient.tsx` edits balances through `useProfile`; `app/api/profile/route.ts` supports authenticated profile storage. This is not airline-account balance retrieval. |
| Automatic airline balance sync | Off in UI; server path experimental | `PortefeuilleClient.tsx` sets `AUTOMATIC_BALANCE_SYNC_ENABLED = false` and labels manual mode. `app/api/balance/sync/route.ts` returns 501 unless `BALANCE_SYNC_ENABLED=true`; even then `lib/portfolio.ts` returns no credentials, so a request can return `success: true` with zero balances. Never enable the server flag without a credential storage/consent design, real supplier integration, and success semantics/tests. |
| Personalized ML deals | Off / placeholder | `app/api/cron/deal-recommendations/route.ts` has hard-coded routes, an empty user list and `getCurrentPrices()` returning `[]`; it cannot generate deals as written and is absent from `vercel.json` crons. `lib/mlPipeline.ts` expects a `number[]` under `keza:price:history:*`, while `lib/priceHistoryRedis.ts` writes a Redis hash under that key. `/api/recommendations/deals` only reads a cache. Wire a typed history source and real prices/users, then test end-to-end before advertising ML recommendations. |
| Multi-leg routing | Experimental, off by default | `lib/config.ts` requires `ENABLE_MULTI_LEG_ROUTING=true`. `lib/engine/index.ts` feeds the route builder one synthetic direct leg per normalized result with assumed departure/arrival time, flight number `0000` and aircraft `000`. It has no verified connection inventory. Keep off until provider segment data and itinerary/booking validation exist. Production flag value was not checked. |
| Seat-map availability on results | Off | `components/FlightCard.tsx` no longer invokes seat-map lookup (`5945c877`). `lib/seatMapsIntegration-server.ts` still contains random fallback counts, but has no in-repository production caller. Do not re-enable without a flight-specific aircraft and supplier-backed seat inventory; remove the dead fallback before reuse. |

## Priority

1. Keep automatic airline sync and multi-leg routing disabled. Do not store airline passwords or turn on experimental flags as a shortcut.
2. Remove false ML and automatic-sync claims from user-facing copy and current-feature docs. Treat `/api/recommendations/deals` as an empty-cache reader until its producer is real.
3. If investing in one of these, first prove supplier entitlement, typed data flow, and a small user-value test. Otherwise retire the placeholder modules/routes to reduce maintenance and AI-agent confusion.

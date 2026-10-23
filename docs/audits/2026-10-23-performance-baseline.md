# Production performance baseline - 2026-10-23

## Scope and method

- Production: `https://keza-taupe.vercel.app`, `/api/version` SHA `b103d0825cb88b854947ff1e265b8f9aaaaa7d7b` before measurement.
- Lighthouse 12.8.2, headless Chrome 148, macOS ARM host, default simulated throttling. Mobile emulation: 412 x 823, 4x CPU slowdown, 150 ms RTT. Desktop preset: 1350 x 940. Fresh Chrome process for each run.
- Routes: `/` and `/prix` three times on mobile; `/` three times on desktop; `/carte` and `/programmes` once per mode; `/prix` once on desktop. No search, checkout, sign-in, or production-data mutation was performed.
- These are synthetic lab results from one host, not global real-user Core Web Vitals. Lighthouse returned no `loadingExperience` or `originLoadingExperience` field data. The small sample and first-run variation preclude a population-level claim.

## Results

Times are seconds; transfer is Lighthouse total byte weight for the page. Ranges are the minimum and maximum of three runs; the value before each range is the median.

| Route / mode | Runs | Performance | FCP | LCP | TBT | CLS | Transfer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home mobile | 3 | 100 (89-100) | 0.98 (0.97-1.73) | 1.35 (1.34-2.21) | 60 ms (59-64) | 0 | 491-498 KB |
| Home desktop | 3 | 100 | 0.31 (0.31-0.32) | 0.39 (0.39-0.40) | 0 ms | 0.001 | 498 KB |
| Prix mobile | 3 | 92 (90-99) | 1.03 (1.03-1.92) | 1.56 (1.54-3.39) | 73 ms (63-142) | 0-0.001 | 425 KB |
| Prix desktop | 1 | 100 | 0.33 | 0.38 | 0 ms | 0.001 | 426 KB |
| Carte mobile | 1 | 100 | 1.00 | 1.30 | 88 ms | 0.001 | 444 KB |
| Carte desktop | 1 | 100 | 0.27 | 0.31 | 0 ms | 0.024 | 484 KB |
| Programmes mobile | 1 | 100 | 1.09 | 1.47 | 51 ms | 0.001 | 411 KB |
| Programmes desktop | 1 | 100 | 0.37 | 0.44 | 0 ms | 0.001 | 413 KB |

The first home mobile run scored 89 (LCP 2.21 s, Speed Index 9.17 s); the next two scored 100. The first Prix mobile run reached 3.39 s LCP, while the other two were about 1.55 s. A separate Prix run showed Speed Index 7.71 s despite 1.56 s LCP. This variation merits repeated cold-run and real-user investigation, not a one-run optimization claim.

## Interpretation and budgets

- Anonymous synthetic server response was short in these runs (roughly 64-125 ms); no evidence here isolates `RootLayout` as the source of the mobile outliers. `RootLayout` does read a server session and mounts three global providers, but its marginal cost and authenticated path were not measured. `grantTrialIfNew` is on the authenticated render path and should be handled under the separate trial-policy decision, not as an unreviewed performance change.
- The local production build for this SHA reported 226 KB shared first-load JS and 319 KB for the home route. CI checks only that no individual chunk exceeds 500 KB; it does not cap total route JS or track Web Vitals.
- Provisional lab budgets for the four public routes: mobile median LCP <= 2.5 s, TBT <= 200 ms, CLS <= 0.1, and page transfer <= 550 KB. Treat these as regression sentinels, not proof of good global performance. Repeat each route at least three times before enforcing a budget in CI; compare distributions, not one score.
- Priority: obtain route- and device-segmented real-user LCP/INP/CLS from the already mounted Speed Insights integration; then reproduce cold mobile Prix and home outliers and inspect the LCP render path. Measure authenticated and anonymous layouts separately before moving providers or server-session work.

## Historical baseline caveat

The tracked `reports/lighthouse/baseline.json` has round figures (home FCP 1200 ms, Prix 1450 ms, Carte 1650 ms, Programmes 1300 ms) identical to the examples in `docs/LIGHTHOUSE_PERFORMANCE_GUIDE.md`. It has no Lighthouse version, Chrome version, production SHA, run count, or raw audit evidence. It may be a sample fixture; it is **not** a verified July production baseline and must not be used to calculate improvement percentages against today's results. The existing `lighthouse:compare` command reads that file, so its output is not a reliable before/after comparison until the baseline is replaced with a measured one.

Reproduction example (raw JSON is intentionally not committed):

```sh
CHROME_PATH=/path/to/Chrome ./node_modules/.bin/lighthouse https://keza-taupe.vercel.app/prix --quiet --output=json --output-path=/tmp/xalifly-prix-mobile.json --chrome-flags='--headless --no-sandbox' --max-wait-for-load=30000
```

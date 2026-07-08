# P0.4 Task 10: Lighthouse Performance Measurement Guide

## Overview

This guide explains how to measure and track performance improvements using Lighthouse audits on:
- Homepage (/)
- Pricing page (/prix)
- Map page (/carte)
- Programs page (/programmes)

## Prerequisites

1. **Development Environment:**
   ```bash
   npm install
   ```

2. **Node.js**: Version 18+
3. **Chrome/Chromium**: Required for Lighthouse headless mode

## Usage

### 1. Create Baseline Report

Create an initial baseline of current performance metrics:

```bash
# Start the development server in one terminal
npm run dev

# In another terminal, run baseline audit
npm run lighthouse:baseline
```

This will:
- Run Lighthouse audit on each page (/, /prix, /carte, /programmes)
- Save results to `reports/lighthouse/baseline.json`
- Display performance summary in console

**Output example:**
```
Page Metrics Summary:

/:
  FCP: 1200 ms
  Performance Score: 72/100

/prix:
  FCP: 1450 ms
  Performance Score: 68/100

/carte:
  FCP: 1650 ms
  Performance Score: 65/100

/programmes:
  FCP: 1300 ms
  Performance Score: 70/100
```

### 2. Compare Performance Metrics

After making optimizations, compare current metrics with baseline:

```bash
# Start the development server
npm run dev

# In another terminal, run comparison
npm run lighthouse:compare
```

This will:
- Load the baseline report
- Run Lighthouse audit on each page
- Generate `reports/lighthouse/comparison.json`
- Generate `reports/lighthouse/performance-report.md`
- Display markdown report in console

**Output example:**
```
# Lighthouse Performance Report

Generated: 2026-07-08T15:30:00.000Z

## Performance Comparison

| Route | Baseline FCP (ms) | Current FCP (ms) | Improvement (ms) | Improvement (%) | Score Change |
|-------|------------------|------------------|------------------|-----------------|--------------|
| / | 1200 | 950 | 250 | 20.8% | +5 |
| /prix | 1450 | 1100 | 350 | 24.1% | +8 |
| /carte | 1650 | 1200 | 450 | 27.3% | +10 |
| /programmes | 1300 | 980 | 320 | 24.6% | +6 |

## Summary

- Pages Audited: 4
- Average FCP Baseline: 1400 ms
- Average FCP Improvement: 343 ms
- Average Improvement: 24.2%
```

### 3. Audit Single Route

Audit performance of a specific route:

```bash
# Start the development server
npm run dev

# In another terminal, audit specific route
npm run lighthouse:audit /prix
```

### 4. Run Performance Tests

Run the Jest test suite for Lighthouse audits:

```bash
# Start the development server
npm run dev

# In another terminal, run tests
npm test -- __tests__/performance/lighthouse.perf.test.ts
```

Or run only the FCP measurement tests:

```bash
npm run test:perf
```

## Reports Directory

All reports are saved to `reports/lighthouse/`:

```
reports/lighthouse/
├── baseline.json          # Initial performance metrics
├── comparison.json        # Comparison with baseline
├── performance-report.md  # Markdown report for documentation
└── audit-results.json     # Individual audit results
```

## Key Metrics

### First Contentful Paint (FCP)

The time from page navigation to the moment when the browser renders the first bit of DOM content.

**Target:** < 1000 ms for optimal UX

### Performance Score

Lighthouse performance score (0-100), computed from multiple metrics.

**Target:** >= 75 for good performance

### Other Metrics Captured

- **LCP (Largest Contentful Paint)**: Time to largest visible content
- **CLS (Cumulative Layout Shift)**: Visual stability
- **TTI (Time to Interactive)**: When page becomes interactive
- **Speed Index**: How quickly content visually populates

## Optimization Tips

### For FCP Improvements:

1. **Code Splitting**: Lazy-load route-specific components
   ```typescript
   const HeavyComponent = dynamic(() => import('@/components/Heavy'), {
     loading: () => <Skeleton />,
     ssr: false,
   });
   ```

2. **Critical CSS**: Inline critical above-the-fold styles

3. **Image Optimization**: Use Next.js Image component with proper sizing

4. **Font Optimization**: Use `next/font` with proper loading strategies

5. **Remove Unused Code**: Tree-shake unnecessary dependencies

## Example: Testing Code Splitting Impact

### Before Optimization:
```
/prix: FCP 1450 ms, Score 68/100
```

### After Lazy-Loading PriceHeatmap:
```
/prix: FCP 1100 ms, Score 76/100
```

**Improvement:** 350 ms reduction (24.1% faster) ✅

## Troubleshooting

### Chrome Not Found

If you see "Chrome not found" error:

```bash
# Install Chrome using Homebrew (macOS)
brew install --cask google-chrome

# Or specify custom Chrome path
CHROME_PATH=/path/to/chrome npm run lighthouse:baseline
```

### Slow Local Network

Lighthouse tests require network access. For best results:
- Run audits on production or staging server
- Use `TEST_BASE_URL` environment variable:

```bash
TEST_BASE_URL=https://keza.com npm run lighthouse:compare
```

### Port Already in Use

If Chrome port conflicts:

```bash
# Use custom port
CHROME_PORT=9223 npm run lighthouse:baseline
```

## Integration with CI/CD

Add to your GitHub Actions workflow:

```yaml
- name: Run Lighthouse Baseline
  run: npm run build && npm run lighthouse:baseline
  env:
    TEST_BASE_URL: http://localhost:3000

- name: Compare Performance
  if: github.event_name == 'pull_request'
  run: npm run lighthouse:compare
```

## P0.4 Task Implementation Status

- ✅ Task 10: Lighthouse Performance Measurement
  - ✅ Implemented LighthouseAuditor class
  - ✅ FCP metric capture for all routes
  - ✅ Baseline creation
  - ✅ Performance comparison
  - ✅ Markdown report generation
  - ✅ Test suite with TDD approach

## References

- [Lighthouse Documentation](https://github.com/GoogleChrome/lighthouse)
- [Web Vitals](https://web.dev/vitals/)
- [Next.js Performance Optimization](https://nextjs.org/learn/seo/web-performance)
- [P0 Phase 4 Plan](./superpowers/plans/2026-07-08-p0-phase4-code-splitting.md)

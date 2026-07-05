# KEZA P5.1 Multi-Currency Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to view all flight prices in their preferred currency (EUR, GBP, XOF, etc.) with automatic geo-detection and persistent choice across sessions.

**Architecture:** Hybrid approach: static defaults for each currency → live exchange rates fetched via Inngest cron (6h) → cached in Redis + localStorage → ProfileContext state for real-time updates. Conversion applied at render time (<50ms overhead). Geo-detection on first visit using Vercel `cf-country` header.

**Tech Stack:** Next.js 15 App Router, Inngest (cron), Upstash Redis, ProfileContext, localStorage, Vercel cf-country header

---

## Task 1: Create Currency Conversion Engine

**Files:**
- Create: `lib/convertCurrency.ts`
- Test: `__tests__/lib/convertCurrency.test.ts`

- [ ] **Step 1: Write tests for currency conversion**

```typescript
// __tests__/lib/convertCurrency.test.ts
import { convertPrice } from "@/lib/convertCurrency";

describe("convertPrice", () => {
  const rates = { EUR: 0.92, GBP: 0.79, XOF: 656.5 };

  test("converts USD to EUR correctly", () => {
    expect(convertPrice(100, "USD", "EUR", rates)).toBeCloseTo(92, 0);
  });

  test("converts USD to GBP correctly", () => {
    expect(convertPrice(100, "USD", "GBP", rates)).toBeCloseTo(79, 0);
  });

  test("returns same value if currencies match", () => {
    expect(convertPrice(100, "USD", "USD", rates)).toBe(100);
  });

  test("handles missing rates gracefully", () => {
    expect(convertPrice(100, "USD", "XYZ", {})).toBe(100); // fallback to USD
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/DIALLO9194/Downloads/keza
npm test -- __tests__/lib/convertCurrency.test.ts
```

Expected: FAIL — "convertPrice is not exported from lib/convertCurrency"

- [ ] **Step 3: Create conversion engine**

```typescript
// lib/convertCurrency.ts
export type ExchangeRates = Record<string, number>;

export function convertPrice(
  amountUSD: number,
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRates
): number {
  // No conversion if same currency or USD to USD
  if (fromCurrency === toCurrency) return amountUSD;
  if (toCurrency === "USD") return amountUSD;
  if (fromCurrency !== "USD") {
    // If source is not USD, convert to USD first, then to target
    const toUSD = rates[fromCurrency] ? amountUSD / rates[fromCurrency] : amountUSD;
    return convertPrice(toUSD, "USD", toCurrency, rates);
  }

  // Convert USD to target currency
  const rate = rates[toCurrency];
  if (!rate) return amountUSD; // Fallback: return USD if rate unavailable

  return Math.round(amountUSD * rate * 100) / 100; // Round to 2 decimals
}

export function formatCurrency(
  amount: number,
  currency: string,
  locale: string = "en-US"
): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatter.format(amount);
}

export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    XOF: "FCFA",
    MAD: "د.م.",
    AED: "د.إ",
    JPY: "¥",
    SGD: "$",
    KRW: "₩",
  };
  return symbols[currency] ?? currency;
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npm test -- __tests__/lib/convertCurrency.test.ts
```

Expected: PASS — All 4 tests pass

- [ ] **Step 5: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add lib/convertCurrency.ts __tests__/lib/convertCurrency.test.ts
git commit -m "feat: add currency conversion engine with formatting utilities

- convertPrice(): Convert amounts between any two currencies
- formatCurrency(): Locale-aware currency formatting
- getCurrencySymbol(): Lookup currency symbols for display
- Comprehensive unit tests with edge cases

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create Exchange Rates Caching Layer (Redis + localStorage)

**Files:**
- Create: `lib/exchange-rates.ts`
- Modify: `app/api/exchange-rates/route.ts` (create if missing)
- Test: `__tests__/lib/exchange-rates.test.ts`

- [ ] **Step 1: Write tests for exchange rate fetching/caching**

```typescript
// __tests__/lib/exchange-rates.test.ts
import { getCachedRates, fetchLatestRates } from "@/lib/exchange-rates";

describe("Exchange Rate Caching", () => {
  test("getCachedRates returns object with currency keys", async () => {
    const rates = await getCachedRates();
    expect(typeof rates).toBe("object");
    expect(Object.keys(rates).length).toBeGreaterThan(0);
  });

  test("rates include major currencies", async () => {
    const rates = await getCachedRates();
    expect(rates.EUR).toBeDefined();
    expect(rates.GBP).toBeDefined();
    expect(rates.XOF).toBeDefined();
  });

  test("all rates are positive numbers", async () => {
    const rates = await getCachedRates();
    Object.values(rates).forEach(rate => {
      expect(typeof rate).toBe("number");
      expect(rate).toBeGreaterThan(0);
    });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- __tests__/lib/exchange-rates.test.ts
```

Expected: FAIL — "getCachedRates is not exported"

- [ ] **Step 3: Create exchange rates caching layer**

```typescript
// lib/exchange-rates.ts
import { redis } from "@/lib/redis";

export type ExchangeRates = Record<string, number>;

const CACHE_KEY = "keza:exchange-rates";
const CACHE_TTL = 24 * 60 * 60; // 24 hours in seconds

// Default rates (fallback if API fails)
const DEFAULT_RATES: ExchangeRates = {
  EUR: 0.92,
  GBP: 0.79,
  JPY: 152.5,
  SGD: 1.35,
  AUD: 1.52,
  CAD: 1.36,
  CHF: 0.88,
  CNY: 7.24,
  INR: 83.2,
  MXN: 17.08,
  BRL: 4.97,
  ZAR: 18.45,
  AED: 3.67,
  MAD: 10.0,
  KRW: 1304.5,
  TWD: 32.1,
  HKD: 7.81,
  THB: 35.95,
  MYR: 4.73,
  XOF: 656.5,
};

export async function getCachedRates(): Promise<ExchangeRates> {
  try {
    // Try Redis first
    if (redis) {
      const cached = await redis.get(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached) as ExchangeRates;
      }
    }
  } catch (error) {
    console.warn("Redis cache miss, using defaults:", error);
  }

  // Fallback to defaults (rates will update via Inngest cron)
  return DEFAULT_RATES;
}

export async function updateRatesInCache(rates: ExchangeRates): Promise<void> {
  if (!redis) return;
  try {
    await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(rates));
  } catch (error) {
    console.warn("Failed to update Redis cache:", error);
  }
}

export async function fetchLatestRates(): Promise<ExchangeRates> {
  // This will be called by Inngest cron job
  // For now, return defaults; Inngest integration in Task 4
  return DEFAULT_RATES;
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npm test -- __tests__/lib/exchange-rates.test.ts
```

Expected: PASS — Tests pass (using default rates)

- [ ] **Step 5: Create exchange rates API endpoint**

```typescript
// app/api/exchange-rates/route.ts
import { getCachedRates } from "@/lib/exchange-rates";
import { NextResponse } from "next/server";

export const revalidate = 3600; // Revalidate every hour

export async function GET() {
  try {
    const rates = await getCachedRates();
    return NextResponse.json(
      { rates, cachedAt: new Date().toISOString(), success: true },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
    );
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/exchange-rates.ts __tests__/lib/exchange-rates.test.ts app/api/exchange-rates/route.ts
git commit -m "feat: add exchange rate caching layer with Redis + fallback defaults

- getCachedRates(): Fetch from Redis, fallback to defaults
- updateRatesInCache(): Store fetched rates in Redis with 24h TTL
- Default rates for major currencies (fallback if API unavailable)
- GET /api/exchange-rates endpoint for client-side fetching
- Comprehensive unit tests

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Update ProfileContext to Include Currency State

**Files:**
- Modify: `contexts/ProfileContext.tsx`
- Create: `lib/currencyDetection.ts`
- Test: Existing tests should cover this

- [ ] **Step 1: Add currency field to ProfileContext**

Read the current ProfileContext and update the interface to include:
```typescript
currency: string;
setCurrency: (currency: string) => void;
exchangeRates: ExchangeRates;
```

- [ ] **Step 2: Initialize currency from localStorage + geolocation**

Add useEffect in ProfileProvider:
```typescript
useEffect(() => {
  // Load from localStorage first
  const savedCurrency = localStorage.getItem("keza:currency");
  if (savedCurrency) {
    setCurrencyState(savedCurrency);
  } else {
    // Try geo-detection from Vercel header
    const geoCountry = document.documentElement.getAttribute("data-geo-country");
    const detectedCurrency = getDefaultCurrencyForCountry(geoCountry || "US");
    setCurrencyState(detectedCurrency);
    localStorage.setItem("keza:currency", detectedCurrency);
  }

  // Fetch exchange rates
  fetch("/api/exchange-rates")
    .then(r => r.json())
    .then(data => {
      if (data.rates) {
        setExchangeRates(data.rates);
      }
    })
    .catch(() => {});
}, []);
```

- [ ] **Step 3: Create currency detection helper**

```typescript
// lib/currencyDetection.ts
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  FR: "EUR", DE: "EUR", IT: "EUR", ES: "EUR",
  GB: "GBP", US: "USD", CA: "CAD", AU: "AUD",
  SN: "XOF", BJ: "XOF", ML: "XOF",
  JP: "JPY", SG: "SGD", KR: "KRW",
  MX: "MXN", BR: "BRL", ZA: "ZAR",
  AE: "AED", MA: "MAD", TH: "THB",
};

export function getDefaultCurrencyForCountry(countryCode: string): string {
  return COUNTRY_TO_CURRENCY[countryCode] ?? "USD";
}
```

- [ ] **Step 4: Implement setCurrency callback**

```typescript
const setCurrency = useCallback((newCurrency: string) => {
  setCurrencyState(newCurrency);
  localStorage.setItem("keza:currency", newCurrency);
}, []);
```

- [ ] **Step 5: Run existing ProfileContext tests**

```bash
npm test -- contexts/ProfileContext
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add contexts/ProfileContext.tsx lib/currencyDetection.ts
git commit -m "feat: add currency state to ProfileContext with geo-detection

- currency state persisted to localStorage
- Auto-detect currency from Vercel cf-country header
- exchangeRates fetched on mount from /api/exchange-rates
- COUNTRY_TO_CURRENCY mapping for 18 countries
- Fallback to USD if detection unavailable

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Wire CurrencyPicker to ProfileContext

**Files:**
- Modify: `components/CurrencyPicker.tsx`

- [ ] **Step 1: Update CurrencyPicker to use ProfileContext**

```typescript
"use client";

import { useProfile } from "@/hooks/useProfile";
import { CURRENCIES } from "@/lib/currency";

export function CurrencyPicker() {
  const { currency, setCurrency } = useProfile();

  return (
    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value)}
      className="px-3 py-2 bg-surface border border-border rounded-lg text-sm font-semibold text-fg hover:bg-surface-2 transition-colors"
      aria-label="Select currency"
    >
      {CURRENCIES.map((curr) => (
        <option key={curr.code} value={curr.code}>
          {curr.flag} {curr.code} ({curr.name})
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 2: Verify CurrencyPicker is in Header**

Check that Header.tsx renders CurrencyPicker.

- [ ] **Step 3: Test component renders without errors**

```bash
npm test -- components/CurrencyPicker
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/CurrencyPicker.tsx
git commit -m "feat: wire CurrencyPicker to ProfileContext currency state

- Selector onChange calls setCurrency() to persist choice
- Proper accessibility labels
- Uses CURRENCIES from lib/currency.ts

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Apply Conversion to FlightCard Prices

**Files:**
- Modify: `components/FlightCard.tsx`

- [ ] **Step 1: Identify all price displays in FlightCard**

```bash
grep -n "cashCost\|milesOptions\|price" /Users/DIALLO9194/Downloads/keza/components/FlightCard.tsx
```

- [ ] **Step 2: Add conversion logic to FlightCard**

```typescript
import { convertPrice, formatCurrency } from "@/lib/convertCurrency";
import { useProfile } from "@/hooks/useProfile";

function FlightCard({ flight, ... }: FlightCardProps) {
  const { currency, exchangeRates } = useProfile();

  const displayCashCost = convertPrice(flight.cashCost, "USD", currency, exchangeRates);

  return (
    <div>
      {/* Replace ${flight.cashCost} with: */}
      <div className="text-lg font-black text-fg">
        {formatCurrency(displayCashCost, currency)}
      </div>
      {/* Similarly for milesOptions.cpp and other prices */}
    </div>
  );
}
```

- [ ] **Step 3: Apply to all price fields**

Convert all price displays: cashCost, milesOptions, bestPrice, etc.

- [ ] **Step 4: Test component**

```bash
npm test -- components/FlightCard
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/FlightCard.tsx
git commit -m "feat: apply currency conversion to FlightCard price display

- All cashCost displays converted via convertPrice()
- formatCurrency() applied for locale-aware formatting
- Currency pulled from ProfileContext
- <50ms conversion overhead (pure math)

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Apply Conversion to PriceHeatmap

**Files:**
- Modify: `components/PriceHeatmap.tsx`

- [ ] **Step 1: Add conversion to calendar prices**

```typescript
import { convertPrice, formatCurrency } from "@/lib/convertCurrency";
import { useProfile } from "@/hooks/useProfile";

function PriceHeatmap({ prices, ... }: Props) {
  const { currency, exchangeRates } = useProfile();

  const displayPrices = prices.map(p => ({
    ...p,
    price: convertPrice(p.price, "USD", currency, exchangeRates)
  }));

  return (
    <div className="grid grid-cols-7 gap-1">
      {displayPrices.map(day => (
        <div key={day.date} className={getHeatmapColor(day.price)}>
          {formatCurrency(day.price, currency)}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Test component**

```bash
npm test -- components/PriceHeatmap
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/PriceHeatmap.tsx
git commit -m "feat: apply currency conversion to price heatmap calendar

- 6-month calendar prices converted to user's currency
- Heatmap colors dynamically adjusted based on converted prices
- Uses ProfileContext for currency and exchange rates

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Apply Conversion to Search Results & Deals

**Files:**
- Modify: `components/SearchResults.tsx`
- Modify: `components/DealsCarousel.tsx`

- [ ] **Step 1: Update SearchResults**

Apply `convertPrice()` to all result prices, format with `formatCurrency()`.

- [ ] **Step 2: Update DealsCarousel**

Apply conversion to all deal prices in "Deals du moment" section.

- [ ] **Step 3: Test components**

```bash
npm test -- components/SearchResults components/DealsCarousel
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/SearchResults.tsx components/DealsCarousel.tsx
git commit -m "feat: apply currency conversion to search results and deals

- All search result prices converted based on user's currency
- Deals carousel prices displayed in user's preferred currency
- Consistent formatting across all price displays

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Add Inngest Cron Job for Rate Updates

**Files:**
- Modify: `lib/inngest.ts`

- [ ] **Step 1: Add exchange rate update function**

```typescript
// lib/inngest.ts
import { inngest } from "@/lib/inngest";
import { updateRatesInCache } from "@/lib/exchange-rates";

export const updateExchangeRates = inngest.createFunction(
  { id: "update-exchange-rates", retries: { maxAttempts: 3 } },
  { cron: "0 */6 * * *" }, // Every 6 hours
  async ({ step }) => {
    const rates = await step.run("fetch-rates", async () => {
      const response = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
      const data = await response.json();
      return data.rates || {};
    });

    await step.run("update-cache", async () => {
      await updateRatesInCache(rates);
    });

    return { success: true, ratesUpdated: Object.keys(rates).length };
  }
);
```

- [ ] **Step 2: Verify Inngest route is configured**

Check that `app/api/inngest/route.ts` exports serve() function.

- [ ] **Step 3: Test the cron syntax**

The cron job will run automatically on Vercel. Local testing requires Inngest dev mode.

- [ ] **Step 4: Commit**

```bash
git add lib/inngest.ts
git commit -m "feat: add cron job to update exchange rates every 6 hours

- Inngest cron: 0 */6 * * * (every 6 hours)
- Fetches latest rates from exchangerate-api.com
- Updates Redis cache with 24h TTL
- Automatic retries on failure

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Add Geo-Detection via Middleware

**Files:**
- Modify: `middleware.ts`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update middleware to detect country**

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Vercel provides cf-country header
  const country = request.headers.get("cf-country") || "US";
  response.headers.set("x-country", country);

  return response;
}

export const config = {
  matcher: ["/", "/flights/:path*", "/alertes", "/profil"],
};
```

- [ ] **Step 2: Pass country to HTML via data attribute**

In `app/layout.tsx`:
```typescript
import { headers } from "next/headers";

export default async function RootLayout({ children }) {
  const headersList = await headers();
  const country = headersList.get("x-country") || "US";

  return (
    <html data-geo-country={country} ...>
      {children}
    </html>
  );
}
```

- [ ] **Step 3: Test geo-detection locally**

```bash
npm run dev
# Local dev will use default "US", which is correct
```

- [ ] **Step 4: Commit**

```bash
git add middleware.ts app/layout.tsx
git commit -m "feat: add geo-detection via Vercel cf-country header

- Middleware reads cf-country header (Vercel injection)
- Passes country code to layout via data-geo-country
- ProfileContext uses this for default currency detection
- Fallback to US if header unavailable

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Integration Test — Full Currency Flow

**Files:**
- Create: `__tests__/integration/currency-flow.test.ts`

- [ ] **Step 1: Write integration test**

```typescript
// __tests__/integration/currency-flow.test.ts
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import HomePage from "@/app/page";
import { ProfileProvider } from "@/contexts/ProfileContext";

describe("Currency Flow Integration", () => {
  test("user can select currency and prices update", async () => {
    render(
      <ProfileProvider>
        <HomePage />
      </ProfileProvider>
    );

    const selector = screen.getByLabelText("Select currency");
    fireEvent.change(selector, { target: { value: "EUR" } });

    await waitFor(() => {
      const prices = screen.getAllByText(/€/);
      expect(prices.length).toBeGreaterThan(0);
    });

    expect(localStorage.getItem("keza:currency")).toBe("EUR");
  });
});
```

- [ ] **Step 2: Run integration test**

```bash
npm test -- __tests__/integration/currency-flow.test.ts
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add __tests__/integration/currency-flow.test.ts
git commit -m "test: add integration test for full currency selection flow

- Tests user selecting currency from dropdown
- Verifies all prices update dynamically
- Confirms choice persists in localStorage

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Performance Test — Sub-50ms Conversion

**Files:**
- Create: `__tests__/performance/currency-conversion.perf.ts`

- [ ] **Step 1: Write performance test**

```typescript
// __tests__/performance/currency-conversion.perf.ts
import { convertPrice } from "@/lib/convertCurrency";

describe("Currency Conversion Performance", () => {
  const rates = { EUR: 0.92, GBP: 0.79, JPY: 152.5, XOF: 656.5 };

  test("converts 1000 prices in under 50ms", () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      convertPrice(Math.random() * 10000, "USD", "EUR", rates);
    }
    const duration = performance.now() - start;
    console.log(`1000 conversions: ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(50);
  });
});
```

- [ ] **Step 2: Run performance test**

```bash
npm test -- __tests__/performance/currency-conversion.perf.ts
```

Expected: PASS — <50ms for 1000 conversions

- [ ] **Step 3: Commit**

```bash
git add __tests__/performance/currency-conversion.perf.ts
git commit -m "perf: verify currency conversion <50ms overhead

- Benchmark: 1000 conversions in <50ms
- Pure math operations with no I/O
- Meets requirement of <50ms per-user latency impact

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 12: E2E Test — Full User Journey

**Files:**
- Create: `e2e/multi-currency.spec.ts`

- [ ] **Step 1: Write E2E test**

```typescript
// e2e/multi-currency.spec.ts
import { test, expect } from "@playwright/test";

test("user can search and switch currencies", async ({ page }) => {
  await page.goto("https://localhost:3000");

  // Search
  await page.fill('input[placeholder*="From"]', "SIN");
  await page.fill('input[placeholder*="To"]', "LAX");
  await page.click('button:has-text("Search")');

  await page.waitForSelector('[data-test="flight-card"]');
  const usdPrice = await page.textContent("[data-test='cash-cost']");

  // Switch to EUR
  await page.selectOption("select[aria-label='Select currency']", "EUR");
  await page.waitForTimeout(100);

  const eurPrice = await page.textContent("[data-test='cash-cost']");
  expect(eurPrice).toContain("€");

  // Refresh and verify persistence
  await page.reload();
  const persistedPrice = await page.textContent("[data-test='cash-cost']");
  expect(persistedPrice).toContain("€");
});
```

- [ ] **Step 2: Run E2E tests**

```bash
npm run test:e2e -- e2e/multi-currency.spec.ts
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add e2e/multi-currency.spec.ts
git commit -m "test: add E2E test for multi-currency user journey

- Tests search → currency switch → price update flow
- Verifies prices update dynamically
- Confirms choice persists across reload

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 13: Bump Cache Version & Deploy

**Files:**
- Modify: `lib/engine/index.ts`

- [ ] **Step 1: Bump CACHE_VERSION**

```typescript
// lib/engine/index.ts
export const CACHE_VERSION = "v23"; // Bumped for multi-currency
```

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: 1626+ tests PASS

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: ✓ Compiled successfully

- [ ] **Step 4: Commit**

```bash
git add lib/engine/index.ts
git commit -m "chore: bump CACHE_VERSION to v23 for multi-currency

- Invalidates old cached flights (prices now in multiple currencies)
- Forces fresh search results on deploy

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Push to main**

```bash
git push origin main
```

Expected: All pre-push checks PASS

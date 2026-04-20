import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { currencyForCountry, type CurrencyCode } from "@/lib/currency";

const CACHE_KEY = "forex:usd:all";
const CACHE_TTL = 12 * 60 * 60; // 12h

// Fallback rates (approximate) if all APIs fail
const FALLBACK_RATES: Record<string, number> = {
  EUR: 0.92, GBP: 0.79, XOF: 605, MAD: 10.0, NGN: 1550, KES: 152,
  CAD: 1.36, AUD: 1.53, JPY: 150, CHF: 0.88, SEK: 10.5, NOK: 10.7,
  DKK: 6.87, BRL: 5.0, INR: 83.5, AED: 3.67, SAR: 3.75, ZAR: 18.5,
  EGP: 49.0, TRY: 32.0,
};

async function fetchAllRates(): Promise<Record<string, number>> {
  // Check Redis cache
  const cached = await redis.get<Record<string, number>>(CACHE_KEY).catch(() => null);
  if (cached && typeof cached === "object" && Object.keys(cached).length > 5) {
    return cached;
  }

  try {
    // Free API — returns all rates from USD base
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 43200 },
    });

    if (res.ok) {
      const data = (await res.json()) as { rates?: Record<string, number> };
      if (data?.rates && Object.keys(data.rates).length > 10) {
        // Pick only the currencies we support
        const rates: Record<string, number> = {};
        for (const [code, rate] of Object.entries(data.rates)) {
          if (typeof rate === "number" && rate > 0) {
            rates[code] = rate;
          }
        }
        await redis.set(CACHE_KEY, rates, { ex: CACHE_TTL }).catch(() => null);
        return rates;
      }
    }
  } catch {
    // Fall through
  }

  return FALLBACK_RATES;
}

// GET /api/forex — returns all exchange rates from USD + auto-detected currency
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const rates = await fetchAllRates();

    // Auto-detect currency from Vercel geo header
    const country = req.headers.get("x-vercel-ip-country") ?? req.geo?.country ?? "";
    const detectedCurrency: CurrencyCode = country
      ? currencyForCountry(country)
      : "USD";

    return NextResponse.json(
      {
        base: "USD",
        rates,
        detected: {
          country: country || null,
          currency: detectedCurrency,
        },
        // Keep backward compat for existing FlightCard
        usdToXof: rates.XOF ?? FALLBACK_RATES.XOF,
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=43200, stale-while-revalidate=86400",
        },
      }
    );
  } catch {
    return NextResponse.json(
      {
        base: "USD",
        rates: FALLBACK_RATES,
        detected: { country: null, currency: "USD" },
        usdToXof: FALLBACK_RATES.XOF,
        updatedAt: null,
      },
      { status: 200 }
    );
  }
}

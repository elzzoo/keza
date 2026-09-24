import "server-only";

import { redis } from "@/lib/redis";
import { logWarn } from "@/lib/logger";
import type { FlightResult } from "@/lib/engine";

export type SearchProvider = "duffel" | "amadeus" | "tp" | "synthetic" | "unknown";
export type SearchStatus = "complete" | "partial" | "cache_hit" | "empty";

const PROVIDERS: SearchProvider[] = ["duffel", "amadeus", "tp", "synthetic", "unknown"];
const STAT_TTL_SECONDS = 30 * 24 * 60 * 60;

function dateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function providerFromResult(result: FlightResult | undefined): SearchProvider {
  switch (result?.source) {
    case "DUFFEL":
      return "duffel";
    case "AMADEUS":
      return "amadeus";
    case "TP":
      return "tp";
    case "SYNTHETIC":
      return "synthetic";
    default:
      return "unknown";
  }
}

function statusForSearch({
  partial,
  fromCache,
  resultCount,
}: {
  partial: boolean;
  fromCache: boolean;
  resultCount: number;
}): SearchStatus {
  if (fromCache) return "cache_hit";
  if (partial) return "partial";
  if (resultCount === 0) return "empty";
  return "complete";
}

function latencyBucket(responseTimeMs: number): string {
  if (responseTimeMs < 1_000) return "lt_1s";
  if (responseTimeMs < 3_000) return "1_3s";
  if (responseTimeMs < 5_000) return "3_5s";
  if (responseTimeMs < 8_000) return "5_8s";
  return "gte_8s";
}

export async function recordSearchObservability({
  from,
  to,
  results,
  partial,
  fromCache,
  responseTimeMs,
  date = new Date(),
}: {
  from: string;
  to: string;
  results: FlightResult[];
  partial: boolean;
  fromCache: boolean;
  responseTimeMs: number;
  date?: Date;
}): Promise<void> {
  const day = dateKey(date);
  const route = `${from}-${to}`;
  const status = statusForSearch({ partial, fromCache, resultCount: results.length });
  const primaryProvider = providerFromResult(results[0]);
  const providerCounts = new Map<SearchProvider, number>();
  for (const provider of PROVIDERS) providerCounts.set(provider, 0);
  for (const result of results) {
    const provider = providerFromResult(result);
    providerCounts.set(provider, (providerCounts.get(provider) ?? 0) + 1);
  }

  const keysToExpire: string[] = [];
  const addExpire = (key: string) => {
    keysToExpire.push(key);
    return key;
  };

  try {
    await Promise.allSettled([
      redis.incr(addExpire(`keza:stats:search:status:${day}:${status}`)),
      redis.incr(addExpire(`keza:stats:search:provider:primary:${day}:${primaryProvider}`)),
      redis.incr(addExpire(`keza:stats:search:latency:${day}:${latencyBucket(responseTimeMs)}`)),
      redis.zincrby(addExpire(`keza:stats:search:routes:${day}`), 1, route),
      ...PROVIDERS.map((provider) => {
        const count = providerCounts.get(provider) ?? 0;
        return count > 0
          ? redis.incrby(addExpire(`keza:stats:search:provider:results:${day}:${provider}`), count)
          : Promise.resolve(0);
      }),
    ]);

    await Promise.allSettled([...new Set(keysToExpire)].map((key) => redis.expire(key, STAT_TTL_SECONDS)));
  } catch (err) {
    logWarn("[searchObservability] record failed", err instanceof Error ? err.message : String(err));
  }
}

export interface SearchObservabilityDay {
  date: string;
  statuses: Record<SearchStatus, number>;
  primaryProviders: Record<SearchProvider, number>;
  resultProviders: Record<SearchProvider, number>;
  latencyBuckets: Record<string, number>;
  topRoutes: Array<{ route: string; count: number }>;
}

export async function getSearchObservabilitySummary(days = 7): Promise<{
  days: SearchObservabilityDay[];
  totals: {
    searches: number;
    partial: number;
    cacheHits: number;
    empty: number;
  };
  fetchedAt: string;
}> {
  const safeDays = Math.min(Math.max(Math.floor(days), 1), 30);
  const rows: SearchObservabilityDay[] = [];

  for (let i = 0; i < safeDays; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const day = dateKey(d);

    const [
      complete,
      partial,
      cacheHit,
      empty,
      primaryProviders,
      resultProviders,
      latencyValues,
      topRoutes,
    ] = await Promise.all([
      redis.get<number>(`keza:stats:search:status:${day}:complete`),
      redis.get<number>(`keza:stats:search:status:${day}:partial`),
      redis.get<number>(`keza:stats:search:status:${day}:cache_hit`),
      redis.get<number>(`keza:stats:search:status:${day}:empty`),
      Promise.all(PROVIDERS.map((provider) => redis.get<number>(`keza:stats:search:provider:primary:${day}:${provider}`))),
      Promise.all(PROVIDERS.map((provider) => redis.get<number>(`keza:stats:search:provider:results:${day}:${provider}`))),
      Promise.all(["lt_1s", "1_3s", "3_5s", "5_8s", "gte_8s"].map((bucket) => redis.get<number>(`keza:stats:search:latency:${day}:${bucket}`))),
      redis.zrange(`keza:stats:search:routes:${day}`, 0, 4, { rev: true, withScores: true }).catch(() => []),
    ]);

    const statuses = {
      complete: complete ?? 0,
      partial: partial ?? 0,
      cache_hit: cacheHit ?? 0,
      empty: empty ?? 0,
    };

    rows.push({
      date: day,
      statuses,
      primaryProviders: Object.fromEntries(PROVIDERS.map((provider, index) => [provider, primaryProviders[index] ?? 0])) as Record<SearchProvider, number>,
      resultProviders: Object.fromEntries(PROVIDERS.map((provider, index) => [provider, resultProviders[index] ?? 0])) as Record<SearchProvider, number>,
      latencyBuckets: Object.fromEntries(["lt_1s", "1_3s", "3_5s", "5_8s", "gte_8s"].map((bucket, index) => [bucket, latencyValues[index] ?? 0])),
      topRoutes: parseTopRoutes(topRoutes),
    });
  }

  return {
    days: rows,
    totals: rows.reduce(
      (acc, row) => ({
        searches: acc.searches + row.statuses.complete + row.statuses.partial + row.statuses.cache_hit + row.statuses.empty,
        partial: acc.partial + row.statuses.partial,
        cacheHits: acc.cacheHits + row.statuses.cache_hit,
        empty: acc.empty + row.statuses.empty,
      }),
      { searches: 0, partial: 0, cacheHits: 0, empty: 0 },
    ),
    fetchedAt: new Date().toISOString(),
  };
}

function parseTopRoutes(value: unknown): Array<{ route: string; count: number }> {
  if (!Array.isArray(value)) return [];

  const routes: Array<{ route: string; count: number }> = [];
  for (let i = 0; i < value.length; i += 2) {
    const route = value[i];
    const count = Number(value[i + 1]);
    if (typeof route === "string" && Number.isFinite(count)) {
      routes.push({ route, count });
    }
  }
  return routes;
}

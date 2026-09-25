import "server-only";

import { getPriceAlertsStoreParity, type PriceAlertsStoreParity } from "@/lib/alertsPostgres";
import type { PriceAlert } from "@/lib/alerts";
import { redis } from "@/lib/redis";
import {
  REDIS_BACKUP_COUNTS_KEY,
  REDIS_BACKUP_LAST_KEY,
  REDIS_BACKUP_META_KEY,
  type RedisBackupMeta,
} from "@/lib/redisBackup";
import { DEALS_KEY } from "@/lib/redisKeys";

export interface B2BLead {
  name: string;
  company: string;
  email: string;
  teamSize: string;
  message?: string;
  receivedAt: string;
}

export type PriceAlertsParityStatus =
  | { ok: true; data: PriceAlertsStoreParity }
  | { ok: false; error: string };

const ALL_ROUTES_KEY = "keza:alerts:routes";
const PUSH_SUBS_KEY = "keza:push:subscriptions";
const LAST_CRON_KEY = "keza:admin:last_cron_at";
const ALERT_KEY = (id: string) => `keza:alert:${id}`;
const ALERTS_BY_ROUTE = (route: string) => {
  const [from, to] = route.split(":");
  return `keza:alerts:route:${from}:${to}`;
};

export async function fetchB2BLeads(): Promise<B2BLead[]> {
  const raw = await redis.lrange("keza:b2b:leads", 0, 49);
  return raw
    .map((item) => {
      try {
        return typeof item === "string" ? JSON.parse(item) : item;
      } catch {
        return null;
      }
    })
    .filter((x): x is B2BLead => x !== null);
}

export async function fetchStats() {
  const [routes, pushSubs, lastCronRaw, dealsTtl] = await Promise.all([
    redis.smembers(ALL_ROUTES_KEY),
    redis.scard(PUSH_SUBS_KEY),
    redis.get<string>(LAST_CRON_KEY),
    redis.ttl(DEALS_KEY),
  ]);

  let activeAlerts = 0;
  for (const route of routes) {
    const ids = (await redis.smembers(ALERTS_BY_ROUTE(route))) as string[];
    for (const id of ids) {
      const alert = await redis.get<PriceAlert>(ALERT_KEY(id));
      if (alert?.active) activeAlerts++;
    }
  }

  const today = new Date();
  const emailOpensByDay: Array<{ date: string; confirmation: number; priceDrop: number; digest: number }> = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayData = await redis.hgetall(`keza:email:opens:${dateStr}`) as Record<string, string> | null;
    emailOpensByDay.push({
      date: dateStr,
      confirmation: parseInt(dayData?.confirmation ?? "0"),
      priceDrop: parseInt(dayData?.["price-drop"] ?? "0"),
      digest: parseInt(dayData?.digest ?? "0"),
    });
  }
  const totalEmailOpens = emailOpensByDay.reduce((s, d) => s + d.confirmation + d.priceDrop + d.digest, 0);

  const todayStr = today.toISOString().slice(0, 10);
  const [clicksToday, clicksTotal] = await Promise.all([
    redis.get<number>(`keza:stats:clicks:${todayStr}`).catch(() => null),
    redis.get<number>(`keza:stats:clicks:total`).catch(() => null),
  ]);

  const totalClicks = Number(clicksTotal ?? 0);
  const estimatedBookings = Math.round(totalClicks * 0.03);
  const estimatedRevenue = estimatedBookings * 18;

  const engineStats: Array<{
    date: string;
    searches: number;
    cacheHits: number;
    cacheMisses: number;
    duffelWins: number;
    tpWins: number;
  }> = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    const [searches, cacheHits, cacheMisses, duffelWins, tpWins] = await Promise.all([
      redis.get<number>(`keza:stats:searches:${dateStr}`),
      redis.get<number>(`keza:stats:cache:hits:${dateStr}`),
      redis.get<number>(`keza:stats:cache:misses:${dateStr}`),
      redis.get<number>(`keza:stats:provider:duffel:${dateStr}`),
      redis.get<number>(`keza:stats:provider:tp:${dateStr}`),
    ]);

    engineStats.push({
      date: dateStr,
      searches: searches ?? 0,
      cacheHits: cacheHits ?? 0,
      cacheMisses: cacheMisses ?? 0,
      duffelWins: duffelWins ?? 0,
      tpWins: tpWins ?? 0,
    });
  }

  return {
    activeAlerts,
    activeRoutes: routes.length,
    pushSubscriptions: pushSubs ?? 0,
    dealsCached: dealsTtl > 0,
    dealsTtlSeconds: dealsTtl > 0 ? dealsTtl : 0,
    lastCronAt: lastCronRaw ?? null,
    fetchedAt: new Date().toISOString(),
    emailOpensByDay,
    totalEmailOpens,
    totalConfirmationOpens: emailOpensByDay.reduce((s, d) => s + d.confirmation, 0),
    totalPriceDropOpens: emailOpensByDay.reduce((s, d) => s + d.priceDrop, 0),
    totalDigestOpens: emailOpensByDay.reduce((s, d) => s + d.digest, 0),
    estimatedRevenue,
    estimatedBookings,
    clicksToday: Number(clicksToday ?? 0),
    clicksTotal: Number(clicksTotal ?? 0),
    engineStats,
  };
}

export async function fetchBackupStatus() {
  const [lastAt, counts, meta] = await Promise.all([
    redis.get<string>(REDIS_BACKUP_LAST_KEY),
    redis.get<Record<string, number>>(REDIS_BACKUP_COUNTS_KEY),
    redis.get<RedisBackupMeta>(REDIS_BACKUP_META_KEY),
  ]);

  return {
    lastAt: lastAt ?? null,
    counts: counts ?? null,
    meta: meta ?? null,
  };
}

export type AdminStats = Awaited<ReturnType<typeof fetchStats>>;
export type BackupStatus = Awaited<ReturnType<typeof fetchBackupStatus>>;

export async function fetchPriceAlertsParityStatus(): Promise<PriceAlertsParityStatus> {
  try {
    const data = await getPriceAlertsStoreParity();
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur de parité inconnue",
    };
  }
}

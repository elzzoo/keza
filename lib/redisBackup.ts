import "server-only";

import { redis } from "@/lib/redis";

const ALERTS_ROUTES_KEY = "keza:alerts:routes";
const B2B_LEADS_KEY = "keza:b2b:leads";
const PUSH_SUBS_KEY = "keza:push:subscriptions";
const PRO_WAITLIST_KEY = "keza:pro:waitlist";
const NEWSLETTER_KEY = "keza:newsletter:subscribers";

export interface CriticalRedisBackup {
  exportedAt: string;
  formatVersion: 1;
  sources: {
    priceAlerts: Awaited<ReturnType<typeof exportPriceAlerts>>;
    b2bLeads: unknown[];
    pushSubscriptions: Awaited<ReturnType<typeof exportPushSubscriptions>>;
    proWaitlist: unknown[];
    newsletterSubscribers: unknown[];
    milesAlerts: Awaited<ReturnType<typeof exportMilesAlerts>>;
  };
  counts: {
    priceAlerts: number;
    b2bLeads: number;
    pushGlobalSubscriptions: number;
    pushEmailBuckets: number;
    proWaitlist: number;
    newsletterSubscribers: number;
    milesAlerts: number;
  };
}

function routeAlertIndexKey(route: string): string {
  const [from, to] = route.split(":");
  return `keza:alerts:route:${from}:${to}`;
}

function alertKey(id: string): string {
  return `keza:alert:${id}`;
}

export function parseJsonMember<T>(value: unknown): T | unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as T;
  } catch {
    return value;
  }
}

async function exportPriceAlerts() {
  const routes = (await redis.smembers(ALERTS_ROUTES_KEY)) as string[];
  const routeIndexes = await Promise.all(
    routes.map(async (route) => ({
      route,
      alertIds: (await redis.smembers(routeAlertIndexKey(route))) as string[],
    })),
  );

  const alertIds = Array.from(new Set(routeIndexes.flatMap((route) => route.alertIds)));
  const alerts = await Promise.all(
    alertIds.map(async (id) => ({
      id,
      value: await redis.get(alertKey(id)),
    })),
  );

  return {
    routes,
    routeIndexes,
    alerts: alerts.filter((entry) => entry.value !== null),
  };
}

async function exportPushSubscriptions() {
  const [globalRaw, perEmailKeys] = await Promise.all([
    redis.smembers(PUSH_SUBS_KEY),
    redis.keys("keza:push:subs:*"),
  ]);

  const perEmail = await Promise.all(
    perEmailKeys.map(async (key) => ({
      key,
      subscriptions: (await redis.smembers(key)).map((item) => parseJsonMember(item)),
    })),
  );

  return {
    global: globalRaw.map((item) => parseJsonMember(item)),
    perEmail,
  };
}

async function exportMilesAlerts() {
  const keys = await redis.keys("keza:miles-alert:*");
  const alerts = await Promise.all(
    keys.map(async (key) => ({
      key,
      value: await redis.get(key),
    })),
  );
  return alerts.filter((entry) => entry.value !== null);
}

export async function buildCriticalRedisBackup(now = new Date()): Promise<CriticalRedisBackup> {
  const [priceAlerts, b2bLeadsRaw, pushSubscriptions, proWaitlist, newsletterSubscribers, milesAlerts] =
    await Promise.all([
      exportPriceAlerts(),
      redis.lrange(B2B_LEADS_KEY, 0, 499),
      exportPushSubscriptions(),
      redis.zrange(PRO_WAITLIST_KEY, 0, -1),
      redis.zrange(NEWSLETTER_KEY, 0, -1),
      exportMilesAlerts(),
    ]);

  return {
    exportedAt: now.toISOString(),
    formatVersion: 1,
    sources: {
      priceAlerts,
      b2bLeads: b2bLeadsRaw.map((item) => parseJsonMember(item)),
      pushSubscriptions,
      proWaitlist,
      newsletterSubscribers,
      milesAlerts,
    },
    counts: {
      priceAlerts: priceAlerts.alerts.length,
      b2bLeads: b2bLeadsRaw.length,
      pushGlobalSubscriptions: pushSubscriptions.global.length,
      pushEmailBuckets: pushSubscriptions.perEmail.length,
      proWaitlist: proWaitlist.length,
      newsletterSubscribers: newsletterSubscribers.length,
      milesAlerts: milesAlerts.length,
    },
  };
}

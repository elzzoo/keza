import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logWarn } from "@/lib/logger";
import { buildCriticalRedisBackup } from "@/lib/redisBackup";
import type { PriceAlert } from "@/lib/alerts";

export function isPriceAlertPostgresSyncEnabled(): boolean {
  return process.env.PRICE_ALERTS_POSTGRES_SYNC === "1";
}

export type PriceAlertsReadSource = "postgres" | "redis";

export function getPriceAlertsReadSource(): PriceAlertsReadSource {
  return isPriceAlertPostgresSyncEnabled() ? "postgres" : "redis";
}

export function priceAlertToRecordData(alert: PriceAlert): Prisma.PriceAlertRecordUncheckedCreateInput {
  return {
    id: alert.id,
    email: alert.email,
    routeFrom: alert.from,
    routeTo: alert.to,
    cabin: alert.cabin,
    basePrice: alert.basePrice,
    targetPrice: alert.targetPrice,
    createdAt: new Date(alert.createdAt),
    lastCheckedAt: alert.lastCheckedAt ? new Date(alert.lastCheckedAt) : null,
    lastPrice: alert.lastPrice ?? null,
    notifCount: alert.notifCount,
    active: alert.active,
    notifFrequency: alert.notifFrequency,
    milesProgram: alert.milesAlert?.program ?? null,
    milesTargetCpp: alert.milesAlert?.targetCpp ?? null,
    milesBaseCpp: alert.milesAlert?.baseCpp ?? null,
    rawJson: alert as unknown as Prisma.InputJsonValue,
  };
}

export function isPriceAlertRecord(value: unknown): value is PriceAlert {
  if (!value || typeof value !== "object") return false;
  const alert = value as Partial<PriceAlert>;
  return (
    typeof alert.id === "string" &&
    typeof alert.email === "string" &&
    typeof alert.from === "string" &&
    typeof alert.to === "string" &&
    typeof alert.cabin === "string" &&
    typeof alert.basePrice === "number" &&
    typeof alert.targetPrice === "number" &&
    typeof alert.createdAt === "string" &&
    typeof alert.notifCount === "number" &&
    typeof alert.active === "boolean" &&
    typeof alert.notifFrequency === "string"
  );
}

function recordToPriceAlert(record: {
  id: string;
  email: string;
  routeFrom: string;
  routeTo: string;
  cabin: string;
  basePrice: number;
  targetPrice: number;
  createdAt: Date;
  lastCheckedAt: Date | null;
  lastPrice: number | null;
  notifCount: number;
  active: boolean;
  notifFrequency: string;
  milesProgram: string | null;
  milesTargetCpp: number | null;
  milesBaseCpp: number | null;
}): PriceAlert {
  return {
    id: record.id,
    email: record.email,
    from: record.routeFrom,
    to: record.routeTo,
    cabin: record.cabin as PriceAlert["cabin"],
    basePrice: record.basePrice,
    targetPrice: record.targetPrice,
    createdAt: record.createdAt.toISOString(),
    ...(record.lastCheckedAt ? { lastCheckedAt: record.lastCheckedAt.toISOString() } : {}),
    ...(record.lastPrice !== null ? { lastPrice: record.lastPrice } : {}),
    notifCount: record.notifCount,
    active: record.active,
    notifFrequency: record.notifFrequency as PriceAlert["notifFrequency"],
    ...(record.milesProgram && record.milesTargetCpp !== null && record.milesBaseCpp !== null
      ? {
          milesAlert: {
            program: record.milesProgram,
            targetCpp: record.milesTargetCpp,
            baseCpp: record.milesBaseCpp,
          },
        }
      : {}),
  };
}

export async function getPriceAlertByIdFromPostgres(id: string): Promise<PriceAlert | null> {
  const record = await prisma.priceAlertRecord.findUnique({ where: { id } });
  return record ? recordToPriceAlert(record) : null;
}

export async function getActivePriceAlertsByEmailFromPostgres(email: string): Promise<PriceAlert[]> {
  const records = await prisma.priceAlertRecord.findMany({
    where: {
      email: email.toLowerCase(),
      active: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return records.map(recordToPriceAlert);
}

export async function getActivePriceAlertsByRouteFromPostgres(
  from: string,
  to: string
): Promise<PriceAlert[]> {
  const records = await prisma.priceAlertRecord.findMany({
    where: {
      routeFrom: from.toUpperCase(),
      routeTo: to.toUpperCase(),
      active: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return records.map(recordToPriceAlert);
}

export async function getAllActivePriceAlertRoutesFromPostgres(): Promise<string[]> {
  const records = await prisma.priceAlertRecord.findMany({
    where: { active: true },
    distinct: ["routeFrom", "routeTo"],
    select: {
      routeFrom: true,
      routeTo: true,
    },
    orderBy: [
      { routeFrom: "asc" },
      { routeTo: "asc" },
    ],
  });
  return records.map((record) => `${record.routeFrom}:${record.routeTo}`);
}

export async function getAllActivePriceAlertsByEmailFromPostgres(): Promise<Map<string, PriceAlert[]>> {
  const records = await prisma.priceAlertRecord.findMany({
    where: { active: true },
    orderBy: [
      { email: "asc" },
      { createdAt: "asc" },
    ],
  });
  const byEmail = new Map<string, PriceAlert[]>();
  for (const alert of records.map(recordToPriceAlert)) {
    const existing = byEmail.get(alert.email) ?? [];
    existing.push(alert);
    byEmail.set(alert.email, existing);
  }
  return byEmail;
}

export async function upsertPriceAlertRecord(alert: PriceAlert): Promise<boolean> {
  try {
    const data = priceAlertToRecordData(alert);
    await prisma.priceAlertRecord.upsert({
      where: { id: alert.id },
      update: data,
      create: data,
    });
    return true;
  } catch (err) {
    logWarn("[alertsPostgres] sync failed", err instanceof Error ? err.message : String(err), {
      alertId: alert.id,
    });
    return false;
  }
}

export async function syncPriceAlertToPostgres(alert: PriceAlert): Promise<boolean> {
  if (!isPriceAlertPostgresSyncEnabled()) return false;
  return upsertPriceAlertRecord(alert);
}

export interface PriceAlertsBackfillResult {
  dryRun: boolean;
  scanned: number;
  valid: number;
  upserted: number;
  failed: number;
}

export interface PriceAlertsStoreParity {
  redis: {
    scanned: number;
    valid: number;
    active: number;
  };
  postgres: {
    total: number;
    active: number;
  };
  missingInPostgres: string[];
  extraInPostgres: string[];
  activeMismatch: string[];
  inSync: boolean;
}

export async function getPriceAlertsStoreParity(): Promise<PriceAlertsStoreParity> {
  const backup = await buildCriticalRedisBackup();
  const redisAlerts = backup.sources.priceAlerts.alerts
    .map((entry) => entry.value)
    .filter(isPriceAlertRecord);
  const redisById = new Map(redisAlerts.map((alert) => [alert.id, alert]));

  const postgresAlerts = await prisma.priceAlertRecord.findMany({
    select: {
      id: true,
      active: true,
    },
  });
  const postgresById = new Map(postgresAlerts.map((alert) => [alert.id, alert]));

  const missingInPostgres = redisAlerts
    .filter((alert) => !postgresById.has(alert.id))
    .map((alert) => alert.id);
  const extraInPostgres = postgresAlerts
    .filter((alert) => !redisById.has(alert.id))
    .map((alert) => alert.id);
  const activeMismatch = redisAlerts
    .filter((alert) => {
      const mirror = postgresById.get(alert.id);
      return mirror && mirror.active !== alert.active;
    })
    .map((alert) => alert.id);

  return {
    redis: {
      scanned: backup.sources.priceAlerts.alerts.length,
      valid: redisAlerts.length,
      active: redisAlerts.filter((alert) => alert.active).length,
    },
    postgres: {
      total: postgresAlerts.length,
      active: postgresAlerts.filter((alert) => alert.active).length,
    },
    missingInPostgres,
    extraInPostgres,
    activeMismatch,
    inSync:
      missingInPostgres.length === 0 &&
      extraInPostgres.length === 0 &&
      activeMismatch.length === 0,
  };
}

export async function backfillPriceAlertsToPostgres({ dryRun = true } = {}): Promise<PriceAlertsBackfillResult> {
  const backup = await buildCriticalRedisBackup();
  const alerts = backup.sources.priceAlerts.alerts
    .map((entry) => entry.value)
    .filter(isPriceAlertRecord);

  if (dryRun) {
    return {
      dryRun,
      scanned: backup.sources.priceAlerts.alerts.length,
      valid: alerts.length,
      upserted: 0,
      failed: 0,
    };
  }

  let upserted = 0;
  let failed = 0;
  for (const alert of alerts) {
    const ok = await upsertPriceAlertRecord(alert);
    if (ok) upserted++;
    else failed++;
  }

  return {
    dryRun,
    scanned: backup.sources.priceAlerts.alerts.length,
    valid: alerts.length,
    upserted,
    failed,
  };
}

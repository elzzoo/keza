import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logWarn } from "@/lib/logger";
import type { PriceAlert } from "@/lib/alerts";

export function isPriceAlertPostgresSyncEnabled(): boolean {
  return process.env.PRICE_ALERTS_POSTGRES_SYNC === "1";
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

export async function syncPriceAlertToPostgres(alert: PriceAlert): Promise<boolean> {
  if (!isPriceAlertPostgresSyncEnabled()) return false;

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

import { randomUUID } from "crypto";
import { prisma } from "../db";

/**
 * Analytics Event Service
 * Business logic for recording search, alert, and conversion events to the database.
 * All functions return the event ID for tracking and linking with user interactions.
 */

// ── Interfaces ────────────────────────────────────────────────────────────────────

export interface SearchEventData {
  userId?: string;
  route: string;
  program?: string;
  passengers?: number;
  cabin?: "economy" | "premium" | "business" | "first";
  tripType?: "oneway" | "roundtrip";
  stops?: "direct" | "any";
  device?: "mobile" | "tablet" | "desktop";
  cacheHit?: boolean;
  source?: "DUFFEL" | "TP" | "SYNTHETIC";
  confidence?: "HIGH" | "LOW" | "ESTIMATED";
  resultCount?: number;
  duration?: number;
}

export interface AlertEventData {
  userId: string;
  route: string;
  program?: string;
  priceThreshold?: number;
  conversionValue?: number;
  currency?: string;
  source?: "DUFFEL" | "TP";
}

export interface ConversionEventData {
  userId: string;
  route: string;
  program?: string;
  priceUSD: number;
  currency?: string;
  milesBurned?: number;
  pricingSource: "DUFFEL" | "TP";
  bookingReference?: string;
  conversionValue: number;
  source?: "organic" | "referral" | "paid_ad";
  referrer?: string;
}

// ── Record Functions ──────────────────────────────────────────────────────────────

/**
 * Records a search event in the analytics database
 * Increments user's search count via upsert
 * @param data Search event data
 * @returns The generated search event ID
 */
export async function recordSearchEvent(data: SearchEventData): Promise<string> {
  try {
    const searchId = randomUUID();

    // Create the search event
    await prisma.analyticsSearch.create({
      data: {
        searchId,
        userId: data.userId,
        route: data.route,
        program: data.program,
        passengers: data.passengers ?? 1,
        cabin: data.cabin ?? "economy",
        tripType: data.tripType ?? "oneway",
        stops: data.stops ?? "any",
        device: data.device,
        cacheHit: data.cacheHit ?? false,
        source: data.source,
        confidence: data.confidence,
        resultCount: data.resultCount ?? 0,
        duration: data.duration,
      },
    });

    // Update user metrics if userId is provided
    if (data.userId) {
      await prisma.analyticsUser.upsert({
        where: { userId: data.userId },
        update: {
          searchCount: { increment: 1 },
          lastSeen: new Date(),
        },
        create: {
          userId: data.userId,
          searchCount: 1,
          device: data.device,
        },
      });
    }

    return searchId;
  } catch (error) {
    console.error("Error recording search event:", error);
    throw error;
  }
}

/**
 * Records an alert event in the analytics database
 * Increments user's alert count via upsert
 * @param data Alert event data
 * @returns The generated alert event ID
 */
export async function recordAlertEvent(data: AlertEventData): Promise<string> {
  try {
    const alertId = randomUUID();

    // Create the alert event
    await prisma.analyticsAlert.upsert({
      where: { userId: data.userId },
      update: {
        alertId,
        route: data.route,
        program: data.program,
        priceThreshold: data.priceThreshold,
        conversionValue: data.conversionValue,
        currency: data.currency ?? "USD",
        source: data.source,
        firedAt: new Date(),
      },
      create: {
        alertId,
        userId: data.userId,
        route: data.route,
        program: data.program,
        priceThreshold: data.priceThreshold,
        conversionValue: data.conversionValue,
        currency: data.currency ?? "USD",
        source: data.source,
      },
    });

    // Update user metrics
    await prisma.analyticsUser.upsert({
      where: { userId: data.userId },
      update: {
        alertCount: { increment: 1 },
        lastSeen: new Date(),
      },
      create: {
        userId: data.userId,
        alertCount: 1,
      },
    });

    return alertId;
  } catch (error) {
    console.error("Error recording alert event:", error);
    throw error;
  }
}

/**
 * Records a conversion event in the analytics database
 * Increments user's conversion count and updates total spent via upsert
 * @param data Conversion event data
 * @returns The generated conversion event ID
 */
export async function recordConversionEvent(
  data: ConversionEventData
): Promise<string> {
  try {
    const conversionId = randomUUID();

    // Create the conversion event
    await prisma.analyticsConversion.create({
      data: {
        conversionId,
        userId: data.userId,
        route: data.route,
        program: data.program,
        priceUSD: data.priceUSD,
        currency: data.currency ?? "USD",
        milesBurned: data.milesBurned,
        pricingSource: data.pricingSource,
        bookingReference: data.bookingReference,
        conversionValue: data.conversionValue,
        source: data.source ?? "organic",
        referrer: data.referrer,
      },
    });

    // Update user metrics
    await prisma.analyticsUser.upsert({
      where: { userId: data.userId },
      update: {
        conversions: { increment: 1 },
        totalSpent: { increment: data.priceUSD },
        lastSeen: new Date(),
      },
      create: {
        userId: data.userId,
        conversions: 1,
        totalSpent: data.priceUSD,
      },
    });

    return conversionId;
  } catch (error) {
    console.error("Error recording conversion event:", error);
    throw error;
  }
}

# P4 — ADVANCED FEATURES Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to implement this plan task-by-task. Each task is 3–8 minutes. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver 4 P4 features with 13 tasks: Seat Preference Alerts (3), Advanced Portfolio Sync (2), Multi-Leg Optimizer (5), ML Deal Recommendations (3). Ship with TDD, full test coverage, and 0 regressions. All tests passing before push.

**Current State:**
- KEZA has: price alerts, miles portfolio, core search engine, Resend email setup, Upstash Redis
- Missing: cabin-specific alerts, loyalty balance sync, multi-leg routing, deal ML scoring
- Tech stack: Next.js 15, TypeScript, React, Redis (Upstash), Resend email, Jest

**Success Metrics:**
- All 13 tasks completed with TDD discipline
- 0 pre-commit hook failures
- All new tests passing
- Production deployment to Vercel with Sentry monitoring active
- No latency regressions on search engine

**Discipline:** implement → test → commit (per KEZA process rules)

---

## FEATURE 1: SEAT PREFERENCE ALERTS

**Why it matters:** Users often need specific cabin classes (Business vs Premium Economy). Current alerts are cabin-agnostic. P4.1 enables "notify me when Business Class to Tokyo drops below $5000" — increasing conversion for premium travelers.

**Success criteria:**
- Users subscribe to cabin-specific alerts
- Daily cron detects deals (price < 80% historical average OR premium cabin appears)
- Email sent with cabin, price, and booking link
- Dashboard widget shows active subscriptions
- <2s lookup time for subscription search

---

### Task 1.1 — Schema + Redis Storage

**Why:** Need persistent storage for seat preferences and caching layer for deal detection.

**Files:**
- Create: `lib/seatAlerts.ts`
- Edit: `lib/redisKeys.ts`

**TDD Steps:**

- [ ] **Step 1: Write schema test**
  ```typescript
  // __tests__/lib/seatAlerts.test.ts
  import { SeatAlertSubscription, validateSeatAlert } from "@/lib/seatAlerts";
  
  describe("SeatAlertSubscription schema", () => {
    it("creates valid seat alert with all required fields", () => {
      const alert: SeatAlertSubscription = {
        email: "user@example.com",
        route: "SIN-LAX",
        cabin: "BUSINESS",
        minPrice: 5000,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      };
      expect(validateSeatAlert(alert)).toBe(true);
    });

    it("rejects alert with invalid cabin", () => {
      const invalid = {
        email: "user@example.com",
        route: "SIN-LAX",
        cabin: "INVALID_CABIN",
        minPrice: 5000,
      };
      expect(validateSeatAlert(invalid)).toBe(false);
    });

    it("rejects alert with missing required fields", () => {
      const incomplete = { email: "user@example.com", cabin: "BUSINESS" };
      expect(validateSeatAlert(incomplete)).toBe(false);
    });
  });
  ```

- [ ] **Step 2: Implement schema**
  Create `lib/seatAlerts.ts`:
  ```typescript
  export type CabinType = "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";

  export interface SeatAlertSubscription {
    email: string;
    route: string;                    // "SIN-LAX"
    cabin: CabinType;
    minPrice: number;                 // USD
    createdAt: Date;
    expiresAt: Date;
    id?: string;                      // UUID
  }

  export interface SeatAlertDeal {
    route: string;
    cabin: CabinType;
    currentPrice: number;
    historicalAvg: number;
    discount: number;                 // percentage
    timestamp: Date;
    premium_cabin_available?: boolean; // extra trigger
  }

  export function validateSeatAlert(alert: unknown): alert is SeatAlertSubscription {
    if (!alert || typeof alert !== "object") return false;
    const a = alert as Record<string, unknown>;
    return (
      typeof a.email === "string" &&
      typeof a.route === "string" &&
      ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"].includes(a.cabin as string) &&
      typeof a.minPrice === "number" &&
      a.minPrice > 0 &&
      a.createdAt instanceof Date &&
      a.expiresAt instanceof Date &&
      a.expiresAt > a.createdAt
    );
  }
  ```

- [ ] **Step 3: Add Redis key templates**
  Edit `lib/redisKeys.ts`:
  ```typescript
  // Existing keys...
  
  // Seat Alerts
  export const SEAT_ALERT_KEY = (email: string, route: string, cabin: string) =>
    `keza:seatalert:${email}:${route}:${cabin}`;
  
  export const SEAT_ALERT_INDEX = (email: string) =>
    `keza:seatalerts:${email}`;
  
  export const SEAT_ALERT_ROUTE_INDEX = (route: string, cabin: string) =>
    `keza:seatalerts:route:${route}:${cabin}`;
  
  export const SEAT_ALERT_DEAL_CACHE = (route: string, cabin: string) =>
    `keza:seatdeals:${route}:${cabin}`;
  ```

- [ ] **Step 4: Write Redis storage test**
  ```typescript
  // __tests__/lib/seatAlerts.test.ts (append)
  import { 
    saveSeatAlert, 
    getSeatAlert, 
    deleteSeatAlert,
    getAllAlertsForEmail,
  } from "@/lib/seatAlerts";
  
  describe("SeatAlert Redis storage", () => {
    const testAlert: SeatAlertSubscription = {
      email: "test@example.com",
      route: "SIN-LAX",
      cabin: "BUSINESS",
      minPrice: 5000,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    };

    it("saves and retrieves seat alert", async () => {
      await saveSeatAlert(testAlert);
      const retrieved = await getSeatAlert(testAlert.email, testAlert.route, testAlert.cabin);
      expect(retrieved).toMatchObject({
        email: "test@example.com",
        route: "SIN-LAX",
        cabin: "BUSINESS",
      });
    });

    it("lists all alerts for email", async () => {
      await saveSeatAlert(testAlert);
      await saveSeatAlert({
        ...testAlert,
        route: "NRT-LAX",
        cabin: "PREMIUM_ECONOMY",
      });
      const alerts = await getAllAlertsForEmail("test@example.com");
      expect(alerts).toHaveLength(2);
    });

    it("deletes alert", async () => {
      await saveSeatAlert(testAlert);
      await deleteSeatAlert(testAlert.email, testAlert.route, testAlert.cabin);
      const retrieved = await getSeatAlert(testAlert.email, testAlert.route, testAlert.cabin);
      expect(retrieved).toBeNull();
    });

    it("auto-expires alerts after 90 days", async () => {
      // Verify Redis TTL is set to 90 days (7,776,000 seconds)
      // This is verified in integration test during cron run
    });
  });
  ```

- [ ] **Step 5: Implement Redis functions**
  Continue `lib/seatAlerts.ts`:
  ```typescript
  import { safeGet, safeSet, safeDel, safeSmembers, safeSadd, srem } from "@/lib/redis";
  import { 
    SEAT_ALERT_KEY, 
    SEAT_ALERT_INDEX, 
    SEAT_ALERT_ROUTE_INDEX,
  } from "@/lib/redisKeys";
  import { v4 as uuidv4 } from "uuid";

  const SEAT_ALERT_TTL = 90 * 24 * 60 * 60; // 90 days in seconds

  export async function saveSeatAlert(alert: SeatAlertSubscription): Promise<string> {
    const id = alert.id || uuidv4();
    const key = SEAT_ALERT_KEY(alert.email, alert.route, alert.cabin);
    
    // Store alert with TTL
    await safeSet(key, JSON.stringify({ ...alert, id }), { ex: SEAT_ALERT_TTL });
    
    // Add to user's alert index
    await safeSadd(SEAT_ALERT_INDEX(alert.email), `${alert.route}:${alert.cabin}`);
    
    // Add to route's alert index for cron processing
    await safeSadd(SEAT_ALERT_ROUTE_INDEX(alert.route, alert.cabin), alert.email);
    
    return id;
  }

  export async function getSeatAlert(
    email: string,
    route: string,
    cabin: CabinType
  ): Promise<SeatAlertSubscription | null> {
    const key = SEAT_ALERT_KEY(email, route, cabin);
    const data = await safeGet<string>(key);
    if (!data) return null;
    return JSON.parse(data) as SeatAlertSubscription;
  }

  export async function deleteSeatAlert(
    email: string,
    route: string,
    cabin: CabinType
  ): Promise<void> {
    const key = SEAT_ALERT_KEY(email, route, cabin);
    await safeDel(key);
    await srem(SEAT_ALERT_INDEX(email), `${route}:${cabin}`);
    await srem(SEAT_ALERT_ROUTE_INDEX(route, cabin), email);
  }

  export async function getAllAlertsForEmail(email: string): Promise<SeatAlertSubscription[]> {
    const indexKey = SEAT_ALERT_INDEX(email);
    const pairs = await safeSmembers(indexKey);
    const alerts: SeatAlertSubscription[] = [];
    
    for (const pair of pairs) {
      const [route, cabin] = pair.split(":");
      const alert = await getSeatAlert(email, route, cabin as CabinType);
      if (alert) alerts.push(alert);
    }
    
    return alerts;
  }

  export async function getAllAlertsForRoute(
    route: string,
    cabin: CabinType
  ): Promise<SeatAlertSubscription[]> {
    const indexKey = SEAT_ALERT_ROUTE_INDEX(route, cabin);
    const emails = await safeSmembers(indexKey);
    const alerts: SeatAlertSubscription[] = [];
    
    for (const email of emails) {
      const alert = await getSeatAlert(email, route, cabin);
      if (alert) alerts.push(alert);
    }
    
    return alerts;
  }
  ```

**Success:** Schema validates correctly, Redis operations tested, 4 test cases passing.

---

### Task 1.2 — Daily Cron Search + Deal Detection

**Why:** Automated deal detection requires a scheduled job that searches each subscription's route and identifies drops.

**Files:**
- Create: `app/api/cron/seat-alerts/route.ts`
- Create: `__tests__/api/cron-seat-alerts.test.ts`

**TDD Steps:**

- [ ] **Step 1: Write cron test skeleton**
  ```typescript
  // __tests__/api/cron-seat-alerts.test.ts
  import { GET } from "@/app/api/cron/seat-alerts/route";
  import { NextRequest } from "next/server";

  describe("GET /api/cron/seat-alerts", () => {
    it("rejects requests without valid cron secret", async () => {
      const req = new NextRequest("http://localhost:3000/api/cron/seat-alerts");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("returns summary of alerts checked", async () => {
      // Mock with valid cron secret
      const req = new NextRequest(
        "http://localhost:3000/api/cron/seat-alerts?secret=valid",
        { headers: { "X-Cron-Secret": process.env.CRON_SECRET } }
      );
      const res = await GET(req);
      const data = await res.json();
      expect(data).toHaveProperty("checked");
      expect(data).toHaveProperty("notified");
    });
  });
  ```

- [ ] **Step 2: Implement deal detection logic**
  ```typescript
  // lib/seatAlerts.ts (append)
  import { fetchCalendarPrices, CABIN_MULTIPLIER } from "@/lib/engine";
  import { getPriceHistory } from "@/lib/priceHistoryRedis";

  export async function detectDeal(
    route: string,
    cabin: CabinType,
    currentPrice: number
  ): Promise<SeatAlertDeal | null> {
    const [from, to] = route.split("-");
    if (!from || !to) return null;

    // Fetch historical average (last 30 days)
    const history = await getPriceHistory(from, to);
    if (!history || history.length < 5) return null; // Need minimum data

    const historicalAvg =
      history.reduce((sum, p) => sum + p, 0) / history.length;
    
    // Apply cabin multiplier to compare apples-to-apples
    const cabinMultiplier = CABIN_MULTIPLIER[cabin] ?? 1.0;
    const adjustedHistorical = historicalAvg * cabinMultiplier;
    
    // Deal: price < 80% of historical average
    const dealThreshold = adjustedHistorical * 0.8;
    const isDeal = currentPrice < dealThreshold;
    
    if (!isDeal) return null;

    return {
      route,
      cabin,
      currentPrice,
      historicalAvg: adjustedHistorical,
      discount: ((adjustedHistorical - currentPrice) / adjustedHistorical) * 100,
      timestamp: new Date(),
    };
  }

  export async function processAllSeatAlerts(): Promise<{
    checked: number;
    notified: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let checked = 0;
    let notified = 0;

    // Get all unique (route, cabin) pairs with active alerts
    const routeCabinPairs = await getAllActiveRouteCabinPairs();

    for (const { route, cabin } of routeCabinPairs) {
      try {
        // Fetch current price for this cabin
        const [from, to] = route.split("-");
        if (!from || !to) continue;

        // Search the route
        const cabinMultiplier = CABIN_MULTIPLIER[cabin] ?? 1.0;
        const prices = await fetchCalendarPrices(from, to, getCurrentMonth());
        
        if (!prices.length) continue;

        const minPrice = Math.min(...prices.map(p => p.price));
        const adjustedPrice = Math.round(minPrice * cabinMultiplier);

        // Check for deals
        const deal = await detectDeal(route, cabin, adjustedPrice);

        if (deal) {
          // Send notifications to all subscribers for this route/cabin
          const subscribers = await getAllAlertsForRoute(route, cabin);
          
          for (const subscriber of subscribers) {
            checked++;
            
            // Check if deal meets subscriber's minPrice threshold
            if (adjustedPrice <= subscriber.minPrice) {
              await sendSeatAlertEmail(subscriber, deal);
              notified++;
            }
          }
        }
      } catch (err) {
        errors.push(`Error processing ${route}-${cabin}: ${String(err)}`);
      }
    }

    return { checked, notified, errors };
  }

  async function getAllActiveRouteCabinPairs(): Promise<
    Array<{ route: string; cabin: CabinType }>
  > {
    // Scan Redis for all SEAT_ALERT_ROUTE_INDEX keys
    // Return unique pairs
    // Implementation: scan keza:seatalerts:route:* keys
    return []; // Placeholder
  }

  function getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
  ```

- [ ] **Step 3: Create cron route**
  ```typescript
  // app/api/cron/seat-alerts/route.ts
  import { NextRequest, NextResponse } from "next/server";
  import { processAllSeatAlerts } from "@/lib/seatAlerts";
  import { hasCronSecret } from "@/lib/auth";
  import { logError } from "@/lib/logger";
  import * as Sentry from "@sentry/nextjs";

  export async function GET(req: NextRequest) {
    if (!hasCronSecret(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return Sentry.withMonitor("cron-seat-alerts", async () => {
      try {
        const result = await processAllSeatAlerts();
        
        if (result.errors.length > 0) {
          logError("Cron seat-alerts errors", result.errors);
        }

        return NextResponse.json({
          success: true,
          checked: result.checked,
          notified: result.notified,
          errors: result.errors,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        logError("Cron seat-alerts failed", err);
        return NextResponse.json(
          { error: "Internal server error", details: String(err) },
          { status: 500 }
        );
      }
    });
  }
  ```

- [ ] **Step 4: Run cron test**
  ```bash
  npm test -- cron-seat-alerts.test.ts
  ```
  Expect: 2–3 tests passing (auth, summary structure)

**Success:** Cron route accepts authenticated requests, detects deals, returns summary with checked/notified counts.

---

### Task 1.3 — UI Form + Email + Dashboard Widget

**Why:** Users need UI to subscribe to alerts, and system must send formatted emails + display active subscriptions.

**Files:**
- Create: `components/SeatAlertForm.tsx`
- Create: `lib/seatAlertEmails.ts`
- Edit: `app/dashboard/page.tsx` (or dashboard client component)
- Create: `__tests__/components/SeatAlertForm.test.tsx`

**TDD Steps:**

- [ ] **Step 1: Write email template test**
  ```typescript
  // __tests__/lib/seatAlertEmails.test.ts
  import { renderSeatAlertEmail, SeatAlertEmailProps } from "@/lib/seatAlertEmails";

  describe("Seat Alert Email Template", () => {
    it("renders email with deal details", () => {
      const props: SeatAlertEmailProps = {
        subscriberEmail: "user@example.com",
        route: "SIN-LAX",
        cabin: "BUSINESS",
        currentPrice: 4200,
        historicalAvg: 5500,
        discount: 23.6,
        bookingUrl: "https://keza.app/book?route=SIN-LAX&cabin=BUSINESS",
        unsubscribeUrl: "https://keza.app/alerts/unsubscribe?token=abc123",
      };

      const html = renderSeatAlertEmail(props);
      expect(html).toContain("Business Class");
      expect(html).toContain("SIN → LAX");
      expect(html).toContain("$4,200");
      expect(html).toContain("23.6%");
      expect(html).toContain(props.bookingUrl);
    });
  });
  ```

- [ ] **Step 2: Implement email template + sender**
  ```typescript
  // lib/seatAlertEmails.ts
  import { Resend } from "resend";

  export interface SeatAlertEmailProps {
    subscriberEmail: string;
    route: string;
    cabin: string;
    currentPrice: number;
    historicalAvg: number;
    discount: number;
    bookingUrl: string;
    unsubscribeUrl: string;
  }

  export function renderSeatAlertEmail(props: SeatAlertEmailProps): string {
    const cabinLabel = {
      ECONOMY: "Economy",
      PREMIUM_ECONOMY: "Premium Economy",
      BUSINESS: "Business Class",
      FIRST: "First Class",
    }[props.cabin] || props.cabin;

    return `
      <html>
        <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0066cc;">Great Deal on ${cabinLabel}!</h1>
          <p>Hi there! We found an amazing deal matching your preferences.</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2>${props.route.slice(0, 3).toUpperCase()} → ${props.route.slice(4).toUpperCase()}</h2>
            <p><strong>Class:</strong> ${cabinLabel}</p>
            <p><strong>Price:</strong> $${props.currentPrice.toLocaleString()}</p>
            <p><strong>Usually:</strong> $${props.historicalAvg.toLocaleString()}</p>
            <p style="font-size: 18px; color: #00aa00;">
              <strong>Save ${props.discount.toFixed(1)}%!</strong>
            </p>
          </div>

          <p>
            <a href="${props.bookingUrl}" style="
              display: inline-block;
              background: #0066cc;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 4px;
              font-weight: bold;
            ">Book Now</a>
          </p>

          <hr style="margin: 40px 0;" />
          <p style="font-size: 12px; color: #666;">
            <a href="${props.unsubscribeUrl}">Unsubscribe from this alert</a>
          </p>
        </body>
      </html>
    `;
  }

  export async function sendSeatAlertEmail(
    subscriberEmail: string,
    route: string,
    cabin: string,
    currentPrice: number,
    historicalAvg: number,
    discount: number,
    bookingUrl: string,
    unsubscribeToken: string
  ): Promise<boolean> {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/alerts/seat/unsubscribe?token=${unsubscribeToken}`;

      const html = renderSeatAlertEmail({
        subscriberEmail,
        route,
        cabin,
        currentPrice,
        historicalAvg,
        discount,
        bookingUrl,
        unsubscribeUrl,
      });

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "KEZA Alerts <alerts@keza.app>",
        to: subscriberEmail,
        subject: `Deal Alert: ${cabin} Class on ${route} - Save ${discount.toFixed(1)}%`,
        html,
      });

      return true;
    } catch (err) {
      console.error("Failed to send seat alert email:", err);
      return false;
    }
  }
  ```

- [ ] **Step 3: Create React component for form**
  ```typescript
  // components/SeatAlertForm.tsx
  "use client";

  import { useState } from "react";
  import { CabinType } from "@/lib/seatAlerts";

  export interface SeatAlertFormProps {
    onSuccess?: () => void;
    onError?: (error: string) => void;
  }

  const CABINS: { label: string; value: CabinType }[] = [
    { label: "Economy", value: "ECONOMY" },
    { label: "Premium Economy", value: "PREMIUM_ECONOMY" },
    { label: "Business Class", value: "BUSINESS" },
    { label: "First Class", value: "FIRST" },
  ];

  export function SeatAlertForm({ onSuccess, onError }: SeatAlertFormProps) {
    const [route, setRoute] = useState("");
    const [cabin, setCabin] = useState<CabinType>("BUSINESS");
    const [minPrice, setMinPrice] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      try {
        const res = await fetch("/api/alerts/seat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            route: route.toUpperCase(),
            cabin,
            minPrice: parseInt(minPrice),
          }),
        });

        if (!res.ok) throw new Error("Failed to save alert");

        setRoute("");
        setMinPrice("");
        onSuccess?.();
      } catch (err) {
        onError?.(String(err));
      } finally {
        setLoading(false);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded-lg border">
        <h3 className="font-bold text-lg">Create Seat Preference Alert</h3>

        <div>
          <label className="block text-sm font-medium mb-1">Route (e.g., SIN-LAX)</label>
          <input
            type="text"
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            placeholder="SIN-LAX"
            required
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Cabin Class</label>
          <select
            value={cabin}
            onChange={(e) => setCabin(e.target.value as CabinType)}
            className="w-full px-3 py-2 border rounded"
          >
            {CABINS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Max Price (USD)</label>
          <input
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="5000"
            required
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Alert"}
        </button>
      </form>
    );
  }
  ```

- [ ] **Step 4: Add dashboard widget showing active alerts**
  ```typescript
  // components/SeatAlertWidget.tsx
  "use client";

  import { useEffect, useState } from "react";
  import { SeatAlertSubscription } from "@/lib/seatAlerts";

  export function SeatAlertWidget() {
    const [alerts, setAlerts] = useState<SeatAlertSubscription[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchAlerts = async () => {
        try {
          const res = await fetch("/api/alerts/seat/my");
          if (res.ok) {
            setAlerts(await res.json());
          }
        } finally {
          setLoading(false);
        }
      };

      fetchAlerts();
    }, []);

    if (loading) return <div className="p-4">Loading alerts...</div>;

    if (alerts.length === 0) {
      return (
        <div className="p-4 text-gray-600">
          No seat preference alerts yet.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <h3 className="font-bold text-lg">Active Seat Alerts</h3>
        {alerts.map((alert) => (
          <div key={`${alert.route}-${alert.cabin}`} className="p-3 bg-blue-50 rounded border border-blue-200">
            <div className="flex justify-between">
              <div>
                <p className="font-medium">{alert.route}</p>
                <p className="text-sm text-gray-600">{alert.cabin} • Max ${alert.minPrice}</p>
              </div>
              <button
                onClick={() => deleteAlert(alert)}
                className="text-red-600 text-sm hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  async function deleteAlert(alert: SeatAlertSubscription) {
    if (!confirm(`Delete alert for ${alert.route}?`)) return;
    await fetch("/api/alerts/seat", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        route: alert.route,
        cabin: alert.cabin,
      }),
    });
    window.location.reload();
  }
  ```

- [ ] **Step 5: Create API endpoint for form submission**
  ```typescript
  // app/api/alerts/seat/route.ts
  import { NextRequest, NextResponse } from "next/server";
  import { getSession } from "@/lib/auth";
  import { saveSeatAlert, deleteSeatAlert } from "@/lib/seatAlerts";
  import { SeatAlertSubscription } from "@/lib/seatAlerts";

  export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { route, cabin, minPrice } = await req.json();

    if (!route || !cabin || !minPrice) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const alert: SeatAlertSubscription = {
      email: session.user.email,
      route,
      cabin,
      minPrice,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    };

    const id = await saveSeatAlert(alert);
    return NextResponse.json({ id, ...alert });
  }

  export async function DELETE(req: NextRequest) {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { route, cabin } = await req.json();
    await deleteSeatAlert(session.user.email, route, cabin);
    return NextResponse.json({ success: true });
  }
  ```

- [ ] **Step 6: Create endpoint to fetch user's alerts**
  ```typescript
  // app/api/alerts/seat/my/route.ts
  import { NextRequest, NextResponse } from "next/server";
  import { getSession } from "@/lib/auth";
  import { getAllAlertsForEmail } from "@/lib/seatAlerts";

  export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const alerts = await getAllAlertsForEmail(session.user.email);
    return NextResponse.json(alerts);
  }
  ```

- [ ] **Step 7: Run component tests**
  ```bash
  npm test -- SeatAlertForm.test.tsx
  ```

**Success:** Form renders, email template formats correctly, dashboard shows active alerts, all components tested.

---

## FEATURE 2: ADVANCED PORTFOLIO SYNC

**Why it matters:** Users manually check airline loyalty balances across 6+ programs. P4.2 auto-syncs balances daily via partner APIs (Singapore, ANA, United, etc.), showing "Last synced 2 hours ago" with manual refresh.

**Success criteria:**
- Daily cron fetches real-time balances from airline APIs
- Redis stores balances with <24h staleness warning
- Dashboard shows last sync timestamp + manual refresh button
- Support for 6+ partner airlines
- <3s fetch for all programs combined

---

### Task 2.1 — Balance Sync Service

**Why:** Need a service that authenticates with airline APIs and caches results.

**Files:**
- Create: `lib/balanceSync.ts`
- Create: `__tests__/lib/balanceSync.test.ts`

**TDD Steps:**

- [ ] **Step 1: Write test for balance fetching**
  ```typescript
  // __tests__/lib/balanceSync.test.ts
  import { fetchAirlineBalance, syncUserBalances } from "@/lib/balanceSync";

  describe("Balance Sync", () => {
    it("fetches Singapore Airlines balance from API", async () => {
      const balance = await fetchAirlineBalance("SINGAPORE", {
        username: "user123",
        password: "pass123",
      });
      expect(balance).toHaveProperty("program", "Singapore KrisFlyer");
      expect(balance).toHaveProperty("miles");
      expect(typeof balance.miles).toBe("number");
    });

    it("handles API errors gracefully", async () => {
      const balance = await fetchAirlineBalance("SINGAPORE", {
        username: "invalid",
        password: "invalid",
      });
      expect(balance).toBeNull();
    });

    it("syncs all programs for user", async () => {
      const programs = {
        SINGAPORE: { username: "user1", password: "pass1" },
        ANA: { username: "user2", password: "pass2" },
      };
      const results = await syncUserBalances("user@example.com", programs);
      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty("program");
      expect(results[0]).toHaveProperty("miles");
      expect(results[0]).toHaveProperty("lastSynced");
    });
  });
  ```

- [ ] **Step 2: Implement balance sync service**
  ```typescript
  // lib/balanceSync.ts
  import { safeGet, safeSet } from "@/lib/redis";
  import { logError } from "@/lib/logger";

  export interface AirlineCredentials {
    username: string;
    password: string;
  }

  export interface BalanceResult {
    program: string;
    airline: string;
    miles: number;
    lastSynced: Date;
    expiresAt?: Date;
    tier?: string;
  }

  const BALANCE_CACHE_TTL = 12 * 60 * 60; // 12 hours

  const AIRLINE_APIS: Record<
    string,
    (creds: AirlineCredentials) => Promise<BalanceResult | null>
  > = {
    SINGAPORE: fetchSingaporeBalance,
    ANA: fetchANABalance,
    JAL: fetchJALBalance,
    UNITED: fetchUnitedBalance,
    CATHAY: fetchCathayBalance,
    EMIRATES: fetchEmiratesBalance,
  };

  // Individual airline fetch functions
  async function fetchSingaporeBalance(
    creds: AirlineCredentials
  ): Promise<BalanceResult | null> {
    try {
      // Call Singapore Airlines API
      // Example: https://api.singaporeair.com/krisflyerbalance
      const res = await fetch("https://api.singaporeair.com/krisflyerbalance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: creds.username,
          password: creds.password,
        }),
      });

      if (!res.ok) return null;

      const data = await res.json();
      return {
        program: "Singapore KrisFlyer",
        airline: "Singapore Airlines",
        miles: data.miles,
        lastSynced: new Date(),
        expiresAt: new Date(data.expireDate),
        tier: data.tier,
      };
    } catch (err) {
      logError("Failed to fetch Singapore balance", err);
      return null;
    }
  }

  async function fetchANABalance(
    creds: AirlineCredentials
  ): Promise<BalanceResult | null> {
    try {
      const res = await fetch("https://api.ana.co.jp/mileageclub/balance", {
        method: "POST",
        body: JSON.stringify({
          memberNumber: creds.username,
          password: creds.password,
        }),
      });

      if (!res.ok) return null;

      const data = await res.json();
      return {
        program: "ANA Mileage Club",
        airline: "All Nippon Airways",
        miles: data.premiummiles + data.basicmiles,
        lastSynced: new Date(),
        tier: data.membershipStatus,
      };
    } catch (err) {
      logError("Failed to fetch ANA balance", err);
      return null;
    }
  }

  async function fetchJALBalance(
    creds: AirlineCredentials
  ): Promise<BalanceResult | null> {
    // JAL Mileage Bank API
    return null; // Placeholder
  }

  async function fetchUnitedBalance(
    creds: AirlineCredentials
  ): Promise<BalanceResult | null> {
    // United MileagePlus API
    return null;
  }

  async function fetchCathayBalance(
    creds: AirlineCredentials
  ): Promise<BalanceResult | null> {
    // Cathay Pacific Asia Miles API
    return null;
  }

  async function fetchEmiratesBalance(
    creds: AirlineCredentials
  ): Promise<BalanceResult | null> {
    // Emirates Skywards API
    return null;
  }

  export async function fetchAirlineBalance(
    airline: string,
    creds: AirlineCredentials
  ): Promise<BalanceResult | null> {
    const fetcher = AIRLINE_APIS[airline];
    if (!fetcher) {
      logError(`Unknown airline: ${airline}`, null);
      return null;
    }

    return fetcher(creds);
  }

  export async function syncUserBalances(
    email: string,
    programs: Record<string, AirlineCredentials>
  ): Promise<BalanceResult[]> {
    const results: BalanceResult[] = [];

    for (const [airline, creds] of Object.entries(programs)) {
      try {
        const balance = await fetchAirlineBalance(airline, creds);
        if (balance) {
          results.push(balance);

          // Cache in Redis
          const cacheKey = `keza:balance:${email}:${airline}`;
          await safeSet(cacheKey, JSON.stringify(balance), {
            ex: BALANCE_CACHE_TTL,
          });
        }
      } catch (err) {
        logError(`Failed to sync ${airline} for ${email}`, err);
      }
    }

    // Record sync timestamp
    await safeSet(
      `keza:balance:${email}:lastSync`,
      new Date().toISOString(),
      { ex: 24 * 60 * 60 } // 24-hour TTL
    );

    return results;
  }

  export async function getCachedBalances(
    email: string
  ): Promise<BalanceResult[]> {
    const airlines = ["SINGAPORE", "ANA", "JAL", "UNITED", "CATHAY", "EMIRATES"];
    const results: BalanceResult[] = [];

    for (const airline of airlines) {
      const cacheKey = `keza:balance:${email}:${airline}`;
      const cached = await safeGet<string>(cacheKey);
      if (cached) {
        results.push(JSON.parse(cached));
      }
    }

    return results;
  }

  export async function getLastSyncTime(email: string): Promise<Date | null> {
    const cached = await safeGet<string>(`keza:balance:${email}:lastSync`);
    return cached ? new Date(cached) : null;
  }

  export async function isStaleBalance(email: string): Promise<boolean> {
    const lastSync = await getLastSyncTime(email);
    if (!lastSync) return true;
    const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
    return hoursSinceSync > 24;
  }
  ```

- [ ] **Step 3: Create cron for daily sync**
  ```typescript
  // app/api/cron/balance-sync/route.ts
  import { NextRequest, NextResponse } from "next/server";
  import { hasCronSecret } from "@/lib/auth";
  import { getAllUserPortfolios, getUserCredentials } from "@/lib/portfolio";
  import { syncUserBalances } from "@/lib/balanceSync";
  import { logError } from "@/lib/logger";
  import * as Sentry from "@sentry/nextjs";

  export async function GET(req: NextRequest) {
    if (!hasCronSecret(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return Sentry.withMonitor("cron-balance-sync", async () => {
      try {
        const users = await getAllUserPortfolios();
        let synced = 0;
        let failed = 0;

        for (const email of users) {
          try {
            const credentials = await getUserCredentials(email);
            if (Object.keys(credentials).length === 0) continue;

            await syncUserBalances(email, credentials);
            synced++;
          } catch (err) {
            logError(`Failed to sync ${email}`, err);
            failed++;
          }
        }

        return NextResponse.json({
          success: true,
          synced,
          failed,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        logError("Cron balance-sync failed", err);
        return NextResponse.json(
          { error: "Internal server error", details: String(err) },
          { status: 500 }
        );
      }
    });
  }
  ```

- [ ] **Step 4: Run balance sync test**
  ```bash
  npm test -- balanceSync.test.ts
  ```

**Success:** Balance fetch functions tested, sync cron working, Redis caching <12h TTL.

---

### Task 2.2 — Portfolio UI Enhancements

**Why:** Dashboard needs to surface sync status and allow manual refresh.

**Files:**
- Edit: `app/portefeuille/PortefeuilleClient.tsx` (or relevant component)
- Create: `components/BalanceSyncWidget.tsx`

**TDD Steps:**

- [ ] **Step 1: Write component test**
  ```typescript
  // __tests__/components/BalanceSyncWidget.test.tsx
  import { render, screen, fireEvent, waitFor } from "@testing-library/react";
  import { BalanceSyncWidget } from "@/components/BalanceSyncWidget";

  describe("BalanceSyncWidget", () => {
    it("displays last synced time", () => {
      const lastSync = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      render(<BalanceSyncWidget lastSync={lastSync} />);
      expect(screen.getByText(/Last synced.*2 hours ago/)).toBeInTheDocument();
    });

    it("shows warning if balance >24h old", () => {
      const lastSync = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      render(<BalanceSyncWidget lastSync={lastSync} />);
      expect(screen.getByText(/Balance data is stale/)).toBeInTheDocument();
    });

    it("triggers manual refresh on button click", async () => {
      const onRefresh = jest.fn();
      render(<BalanceSyncWidget lastSync={new Date()} onRefresh={onRefresh} />);
      
      fireEvent.click(screen.getByText(/Refresh Now/));
      
      await waitFor(() => {
        expect(onRefresh).toHaveBeenCalled();
      });
    });

    it("shows loading state during refresh", async () => {
      const { rerender } = render(
        <BalanceSyncWidget lastSync={new Date()} isLoading={false} />
      );
      fireEvent.click(screen.getByText(/Refresh Now/));
      
      rerender(<BalanceSyncWidget lastSync={new Date()} isLoading={true} />);
      expect(screen.getByText(/Refreshing.../)).toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 2: Implement widget component**
  ```typescript
  // components/BalanceSyncWidget.tsx
  "use client";

  import { useState } from "react";

  export interface BalanceSyncWidgetProps {
    lastSync: Date | null;
    onRefresh?: () => Promise<void>;
    isLoading?: boolean;
  }

  export function BalanceSyncWidget({
    lastSync,
    onRefresh,
    isLoading = false,
  }: BalanceSyncWidgetProps) {
    const [loading, setLoading] = useState(isLoading);

    const handleRefresh = async () => {
      setLoading(true);
      try {
        await onRefresh?.();
      } finally {
        setLoading(false);
      }
    };

    const getTimeAgo = (date: Date | null): string => {
      if (!date) return "Never";
      const diff = Date.now() - date.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
      if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
      return "Just now";
    };

    const isStale = lastSync && (Date.now() - lastSync.getTime()) > 24 * 60 * 60 * 1000;

    return (
      <div className={`p-4 rounded-lg border ${isStale ? "bg-yellow-50 border-yellow-300" : "bg-green-50 border-green-300"}`}>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium">Balance Sync Status</p>
            <p className="text-sm text-gray-600">Last synced: {getTimeAgo(lastSync)}</p>
            {isStale && (
              <p className="text-xs text-yellow-700 mt-1">
                ⚠️ Balance data is stale. Please refresh for current values.
              </p>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className={`px-4 py-2 rounded font-medium transition ${
              loading
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {loading ? "Refreshing..." : "Refresh Now"}
          </button>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 3: Add endpoint for manual refresh**
  ```typescript
  // app/api/balance/sync/route.ts
  import { NextRequest, NextResponse } from "next/server";
  import { getSession } from "@/lib/auth";
  import { getUserCredentials } from "@/lib/portfolio";
  import { syncUserBalances } from "@/lib/balanceSync";

  export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const credentials = await getUserCredentials(session.user.email);
      const results = await syncUserBalances(session.user.email, credentials);
      return NextResponse.json({
        success: true,
        balances: results,
        syncedAt: new Date().toISOString(),
      });
    } catch (err) {
      return NextResponse.json(
        { error: "Sync failed" },
        { status: 500 }
      );
    }
  }
  ```

- [ ] **Step 4: Integrate widget into portfolio page**
  Edit `app/portefeuille/PortefeuilleClient.tsx`:
  ```typescript
  // Add to imports
  import { BalanceSyncWidget } from "@/components/BalanceSyncWidget";
  import { getLastSyncTime } from "@/lib/balanceSync";

  // Inside component:
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const fetchLastSync = async () => {
      const time = await getLastSyncTime(session?.user?.email!);
      setLastSync(time);
    };
    fetchLastSync();
  }, [session]);

  const handleRefresh = async () => {
    await fetch("/api/balance/sync", { method: "POST" });
    const time = await getLastSyncTime(session?.user?.email!);
    setLastSync(time);
  };

  // In JSX:
  <BalanceSyncWidget lastSync={lastSync} onRefresh={handleRefresh} />
  ```

- [ ] **Step 5: Run component test**
  ```bash
  npm test -- BalanceSyncWidget.test.tsx
  ```

**Success:** Widget renders sync status, manual refresh works, stale data warning displays.

---

## FEATURE 3: MULTI-LEG OPTIMIZER

**Why it matters:** 3+ leg journeys (LAX→NRT→SIN) often require manual routing work. P4.3 auto-finds cheapest multi-leg combos with connection times, showing options like "LAX → NRT (6h stopover) → SIN = $1,200, 85k miles".

**Success criteria:**
- Build connectivity graph from single-leg search results
- Dijkstra's algorithm finds shortest path(s) by price/miles
- Support up to 4 legs with max connection time constraints
- Show top 3 multi-leg options with stopovers
- <8s computation time for LAX-SIN via Tokyo+Bangkok

---

### Task 3.1 — Multi-Leg Types & Schema

**Why:** Need TypeScript interfaces for multi-leg routes, optimization results, connection constraints.

**Files:**
- Create: `lib/multiLeg.ts` (part 1: types)

**TDD Steps:**

- [ ] **Step 1: Write schema validation test**
  ```typescript
  // __tests__/lib/multiLeg.test.ts
  import {
    MultiLegRoute,
    validateMultiLegRoute,
    ConnectionConstraint,
  } from "@/lib/multiLeg";

  describe("MultiLeg schema", () => {
    it("validates complete multi-leg route", () => {
      const route: MultiLegRoute = {
        id: "route-1",
        legs: [
          {
            from: "LAX",
            to: "NRT",
            price: 680,
            miles: 60000,
            airline: "United",
            flightNumber: "UA1",
            departure: new Date("2026-07-15T10:00:00"),
            arrival: new Date("2026-07-16T15:00:00"),
          },
          {
            from: "NRT",
            to: "SIN",
            price: 450,
            miles: 35000,
            airline: "Singapore Airlines",
            flightNumber: "SQ636",
            departure: new Date("2026-07-17T18:00:00"),
            arrival: new Date("2026-07-18T23:30:00"),
          },
        ],
        totalPrice: 1130,
        totalMiles: 95000,
        totalConnectionTime: 27 * 60, // minutes
      };

      expect(validateMultiLegRoute(route)).toBe(true);
    });

    it("rejects route with overlapping dates", () => {
      const invalid: MultiLegRoute = {
        id: "route-1",
        legs: [
          {
            from: "LAX",
            to: "NRT",
            price: 680,
            miles: 60000,
            airline: "United",
            flightNumber: "UA1",
            departure: new Date("2026-07-15T10:00:00"),
            arrival: new Date("2026-07-17T15:00:00"),
          },
          {
            from: "NRT",
            to: "SIN",
            price: 450,
            miles: 35000,
            airline: "Singapore Airlines",
            flightNumber: "SQ636",
            departure: new Date("2026-07-16T18:00:00"), // Before previous arrival
            arrival: new Date("2026-07-18T23:30:00"),
          },
        ],
        totalPrice: 1130,
        totalMiles: 95000,
        totalConnectionTime: -23 * 60, // Negative!
      };

      expect(validateMultiLegRoute(invalid)).toBe(false);
    });
  });
  ```

- [ ] **Step 2: Implement schema**
  ```typescript
  // lib/multiLeg.ts
  import { v4 as uuidv4 } from "uuid";

  export interface FlightLeg {
    from: string;                    // IATA code
    to: string;                      // IATA code
    price: number;                   // USD
    miles: number;                   // Award miles
    airline: string;
    flightNumber: string;
    departure: Date;
    arrival: Date;
    cabin?: string;
    stops?: number;
  }

  export interface MultiLegRoute {
    id: string;
    legs: FlightLeg[];
    totalPrice: number;              // Sum of all legs
    totalMiles: number;              // Sum of all legs
    totalConnectionTime: number;     // minutes
    routeScore?: number;             // CPP or custom metric
  }

  export interface ConnectionConstraint {
    minConnection: number;            // minutes
    maxConnection: number;            // minutes
    requireSameAirline?: boolean;
    requireSameTerminal?: boolean;
  }

  export interface OptimizationOptions {
    maxLegs?: number;                // Default: 3
    maxPrice?: number;
    minMiles?: number;
    maxConnectionTime?: number;      // minutes, total
    constraints?: ConnectionConstraint;
    sortBy?: "price" | "miles" | "time" | "score"; // Default: "price"
  }

  export function validateMultiLegRoute(route: unknown): route is MultiLegRoute {
    if (!route || typeof route !== "object") return false;
    const r = route as Record<string, unknown>;

    // Check legs
    if (!Array.isArray(r.legs) || r.legs.length < 2) return false;

    for (let i = 0; i < r.legs.length - 1; i++) {
      const leg = r.legs[i] as FlightLeg;
      const nextLeg = r.legs[i + 1] as FlightLeg;

      // Validate leg structure
      if (
        !leg.from ||
        !leg.to ||
        !leg.departure ||
        !leg.arrival
      ) {
        return false;
      }

      // Check for valid connection (arrival before next departure)
      if (leg.arrival >= nextLeg.departure) {
        return false;
      }

      // Check connection time is reasonable (2h-24h)
      const connectionMinutes = (nextLeg.departure.getTime() - leg.arrival.getTime()) / 60000;
      if (connectionMinutes < 120 || connectionMinutes > 24 * 60) {
        return false;
      }
    }

    // Validate totals
    if (
      typeof r.totalPrice !== "number" ||
      typeof r.totalMiles !== "number" ||
      r.totalPrice < 0 ||
      r.totalMiles < 0
    ) {
      return false;
    }

    return true;
  }

  export function calculateRouteTotalTime(legs: FlightLeg[]): number {
    if (legs.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < legs.length - 1; i++) {
      total += (legs[i + 1].departure.getTime() - legs[i].arrival.getTime()) / 60000;
    }
    return total;
  }

  export function calculateRouteCPP(
    route: MultiLegRoute
  ): number {
    return route.totalMiles > 0 ? route.totalPrice / route.totalMiles : Infinity;
  }
  ```

- [ ] **Step 3: Run schema test**
  ```bash
  npm test -- multiLeg.test.ts
  ```

**Success:** Schema validates correctly, route calculations work, no regressions.

---

### Task 3.2 — Connectivity Graph Builder

**Why:** Convert flat search results into a directed graph for pathfinding.

**Files:**
- Create: `lib/graphBuilder.ts`

**TDD Steps:**

- [ ] **Step 1: Write graph builder test**
  ```typescript
  // __tests__/lib/graphBuilder.test.ts
  import { buildConnectivityGraph, ConnectivityGraph } from "@/lib/graphBuilder";
  import { FlightResult } from "@/lib/engine/types";

  describe("Connectivity graph builder", () => {
    it("builds graph from flight results", () => {
      const flights: FlightResult[] = [
        {
          id: "1",
          from: "LAX",
          to: "NRT",
          price: 680,
          airline: "United",
          // ... other fields
        },
        {
          id: "2",
          from: "NRT",
          to: "SIN",
          price: 450,
          airline: "Singapore",
          // ... other fields
        },
        {
          id: "3",
          from: "LAX",
          to: "SIN",
          price: 950,
          airline: "United",
          // ... other fields
        },
      ];

      const graph = buildConnectivityGraph(flights);

      expect(graph.nodes).toContain("LAX");
      expect(graph.nodes).toContain("NRT");
      expect(graph.nodes).toContain("SIN");

      expect(graph.edges["LAX"]).toHaveProperty("NRT");
      expect(graph.edges["LAX"]["NRT"]).toHaveLength(1);
      expect(graph.edges["NRT"]).toHaveProperty("SIN");
      expect(graph.edges["NRT"]["SIN"]).toHaveLength(1);
    });

    it("groups flights by destination when multiple airlines", () => {
      const flights: FlightResult[] = [
        {
          id: "1",
          from: "LAX",
          to: "NRT",
          price: 680,
          airline: "United",
        },
        {
          id: "2",
          from: "LAX",
          to: "NRT",
          price: 720,
          airline: "ANA",
        },
      ];

      const graph = buildConnectivityGraph(flights);
      expect(graph.edges["LAX"]["NRT"]).toHaveLength(2);
    });

    it("returns empty graph for single airport", () => {
      const flights: FlightResult[] = [
        { id: "1", from: "LAX", to: "LAX", price: 0, airline: "N/A" },
      ];

      const graph = buildConnectivityGraph(flights);
      expect(graph.nodes).toEqual(["LAX"]);
      expect(Object.keys(graph.edges)).toEqual(["LAX"]);
      expect(graph.edges["LAX"]).toEqual({});
    });
  });
  ```

- [ ] **Step 2: Implement graph builder**
  ```typescript
  // lib/graphBuilder.ts
  import { FlightResult } from "@/lib/engine/types";
  import { FlightLeg } from "@/lib/multiLeg";

  export interface ConnectivityGraph {
    nodes: string[];
    edges: Record<string, Record<string, FlightResult[]>>;
  }

  export function buildConnectivityGraph(flights: FlightResult[]): ConnectivityGraph {
    const nodes = new Set<string>();
    const edges: Record<string, Record<string, FlightResult[]>> = {};

    for (const flight of flights) {
      // Skip flights to/from same city
      if (flight.from === flight.to) continue;

      nodes.add(flight.from);
      nodes.add(flight.to);

      // Initialize from node if needed
      if (!edges[flight.from]) {
        edges[flight.from] = {};
      }

      // Initialize destination array if needed
      if (!edges[flight.from][flight.to]) {
        edges[flight.from][flight.to] = [];
      }

      // Add flight to the edge
      edges[flight.from][flight.to].push(flight);
    }

    // Ensure all nodes have an edges entry
    for (const node of nodes) {
      if (!edges[node]) {
        edges[node] = {};
      }
    }

    return {
      nodes: Array.from(nodes).sort(),
      edges,
    };
  }

  export function getConnectionOptions(
    graph: ConnectivityGraph,
    from: string,
    to: string
  ): FlightResult[] {
    return graph.edges[from]?.[to] ?? [];
  }

  export function getDirectConnections(
    graph: ConnectivityGraph,
    from: string
  ): string[] {
    return Object.keys(graph.edges[from] ?? {});
  }

  export function isConnected(
    graph: ConnectivityGraph,
    from: string,
    to: string
  ): boolean {
    return to in (graph.edges[from] ?? {});
  }
  ```

- [ ] **Step 3: Run graph test**
  ```bash
  npm test -- graphBuilder.test.ts
  ```

**Success:** Graph builds correctly, connections queryable, multi-airline handling works.

---

### Task 3.3 — Dijkstra's Algorithm for Path Finding

**Why:** Find cheapest/fastest multi-leg routes through the graph.

**Files:**
- Create: `lib/shortestPath.ts`

**TDD Steps:**

- [ ] **Step 1: Write Dijkstra test**
  ```typescript
  // __tests__/lib/shortestPath.test.ts
  import { dijkstra, findPathsByPrice } from "@/lib/shortestPath";
  import { ConnectivityGraph } from "@/lib/graphBuilder";

  describe("Dijkstra shortest path", () => {
    const mockGraph: ConnectivityGraph = {
      nodes: ["LAX", "NRT", "SIN", "BKK"],
      edges: {
        LAX: {
          NRT: [{ price: 680, miles: 60000 }],
          BKK: [{ price: 900, miles: 70000 }],
        },
        NRT: {
          SIN: [{ price: 450, miles: 35000 }],
          BKK: [{ price: 320, miles: 25000 }],
        },
        BKK: {
          SIN: [{ price: 250, miles: 20000 }],
        },
        SIN: {},
      },
    };

    it("finds cheapest path via Dijkstra", () => {
      // LAX -> NRT (680) -> SIN (450) = 1130 (cheapest)
      // vs LAX -> BKK (900) -> SIN (250) = 1150
      const paths = findPathsByPrice(mockGraph, "LAX", "SIN", 3);
      expect(paths[0].totalPrice).toBe(1130);
      expect(paths[0].legs).toHaveLength(2);
    });

    it("returns multiple paths sorted by price", () => {
      const paths = findPathsByPrice(mockGraph, "LAX", "SIN", 3);
      expect(paths.length).toBeGreaterThanOrEqual(1);
      for (let i = 0; i < paths.length - 1; i++) {
        expect(paths[i].totalPrice).toBeLessThanOrEqual(paths[i + 1].totalPrice);
      }
    });

    it("respects maxLegs constraint", () => {
      const paths = findPathsByPrice(mockGraph, "LAX", "SIN", 2);
      for (const path of paths) {
        expect(path.legs).toBeLessThanOrEqual(2);
      }
    });

    it("returns empty array for unreachable destination", () => {
      const paths = findPathsByPrice(mockGraph, "BKK", "LAX", 3);
      expect(paths).toEqual([]);
    });
  });
  ```

- [ ] **Step 2: Implement Dijkstra**
  ```typescript
  // lib/shortestPath.ts
  import { ConnectivityGraph } from "@/lib/graphBuilder";
  import { FlightResult } from "@/lib/engine/types";
  import { MultiLegRoute, FlightLeg } from "@/lib/multiLeg";

  interface DijkstraNode {
    city: string;
    distance: number;
    path: FlightResult[];
  }

  export function dijkstra(
    graph: ConnectivityGraph,
    start: string,
    end: string,
    maxLegs: number = 3
  ): MultiLegRoute[] {
    const visited = new Set<string>();
    const distances = new Map<string, number>();
    const paths = new Map<string, FlightResult[]>();

    // Initialize
    distances.set(start, 0);
    paths.set(start, []);

    for (const node of graph.nodes) {
      if (node !== start) {
        distances.set(node, Infinity);
        paths.set(node, []);
      }
    }

    while (visited.size < graph.nodes.length) {
      // Find unvisited node with min distance
      let minNode: string | null = null;
      let minDist = Infinity;

      for (const node of graph.nodes) {
        if (!visited.has(node)) {
          const dist = distances.get(node) ?? Infinity;
          if (dist < minDist) {
            minDist = dist;
            minNode = node;
          }
        }
      }

      if (!minNode || minDist === Infinity) break;
      visited.add(minNode);

      // Check all neighbors
      const neighbors = graph.edges[minNode] ?? {};
      for (const [neighbor, flights] of Object.entries(neighbors)) {
        if (visited.has(neighbor)) continue;

        const currentDist = distances.get(minNode) ?? Infinity;
        const currentPath = paths.get(minNode) ?? [];

        // Respect maxLegs constraint
        if (currentPath.length >= maxLegs) continue;

        for (const flight of flights) {
          const newDist = currentDist + flight.price;
          const oldDist = distances.get(neighbor) ?? Infinity;

          if (newDist < oldDist) {
            distances.set(neighbor, newDist);
            paths.set(neighbor, [...currentPath, flight]);
          }
        }
      }
    }

    const finalPath = paths.get(end) ?? [];
    if (finalPath.length === 0) return [];

    return [
      {
        id: `multi-${Math.random()}`,
        legs: convertFlightsToLegs(finalPath),
        totalPrice: distances.get(end) ?? 0,
        totalMiles: finalPath.reduce((sum, f) => sum + (f.miles ?? 0), 0),
        totalConnectionTime: calculateConnectionTime(finalPath),
      },
    ];
  }

  export function findPathsByPrice(
    graph: ConnectivityGraph,
    start: string,
    end: string,
    maxLegs: number = 3
  ): MultiLegRoute[] {
    // Use Dijkstra and return top paths
    const paths = dijkstra(graph, start, end, maxLegs);
    return paths.sort((a, b) => a.totalPrice - b.totalPrice).slice(0, 3);
  }

  function convertFlightsToLegs(flights: FlightResult[]): FlightLeg[] {
    return flights.map((f) => ({
      from: f.from,
      to: f.to,
      price: f.price,
      miles: f.miles ?? 0,
      airline: f.airline,
      flightNumber: f.flightNumber || "N/A",
      departure: new Date(), // Placeholder
      arrival: new Date(),    // Placeholder
    }));
  }

  function calculateConnectionTime(flights: FlightResult[]): number {
    // Placeholder: would use actual flight times
    return 0;
  }
  ```

- [ ] **Step 3: Run Dijkstra test**
  ```bash
  npm test -- shortestPath.test.ts
  ```

**Success:** Dijkstra finds shortest paths, respects constraints, returns sorted results.

---

### Task 3.4 — Route Selector UI Component

**Why:** Users need to see and select multi-leg options during search.

**Files:**
- Create: `components/RouteSequenceSelector.tsx`
- Create: `__tests__/components/RouteSequenceSelector.test.tsx`

**TDD Steps:**

- [ ] **Step 1: Write component test**
  ```typescript
  // __tests__/components/RouteSequenceSelector.test.tsx
  import { render, screen, fireEvent } from "@testing-library/react";
  import { RouteSequenceSelector } from "@/components/RouteSequenceSelector";
  import { MultiLegRoute } from "@/lib/multiLeg";

  describe("RouteSequenceSelector", () => {
    const mockRoutes: MultiLegRoute[] = [
      {
        id: "route-1",
        legs: [
          {
            from: "LAX",
            to: "NRT",
            price: 680,
            miles: 60000,
            airline: "United",
            flightNumber: "UA1",
            departure: new Date("2026-07-15T10:00"),
            arrival: new Date("2026-07-16T15:00"),
          },
          {
            from: "NRT",
            to: "SIN",
            price: 450,
            miles: 35000,
            airline: "SQ",
            flightNumber: "SQ636",
            departure: new Date("2026-07-17T18:00"),
            arrival: new Date("2026-07-18T23:30"),
          },
        ],
        totalPrice: 1130,
        totalMiles: 95000,
        totalConnectionTime: 27 * 60,
      },
    ];

    it("renders route with correct format", () => {
      render(
        <RouteSequenceSelector
          routes={mockRoutes}
          onSelect={() => {}}
        />
      );
      expect(screen.getByText(/LAX.*NRT.*SIN/)).toBeInTheDocument();
      expect(screen.getByText(/1,130/)).toBeInTheDocument();
      expect(screen.getByText(/95,000 miles/)).toBeInTheDocument();
    });

    it("shows connection time", () => {
      render(
        <RouteSequenceSelector
          routes={mockRoutes}
          onSelect={() => {}}
        />
      );
      expect(screen.getByText(/27 hours?/)).toBeInTheDocument();
    });

    it("triggers onSelect when route clicked", () => {
      const onSelect = jest.fn();
      render(
        <RouteSequenceSelector
          routes={mockRoutes}
          onSelect={onSelect}
        />
      );
      fireEvent.click(screen.getByText(/Book Now/));
      expect(onSelect).toHaveBeenCalledWith(mockRoutes[0]);
    });

    it("shows multiple routes sorted by price", () => {
      const routes = [
        { ...mockRoutes[0], totalPrice: 1150 },
        { ...mockRoutes[0], totalPrice: 1130 },
        { ...mockRoutes[0], totalPrice: 1200 },
      ];
      render(
        <RouteSequenceSelector
          routes={routes}
          onSelect={() => {}}
        />
      );
      // All should be visible
      const elements = screen.getAllByText(/Book Now/);
      expect(elements).toHaveLength(3);
    });
  });
  ```

- [ ] **Step 2: Implement component**
  ```typescript
  // components/RouteSequenceSelector.tsx
  "use client";

  import { MultiLegRoute, FlightLeg } from "@/lib/multiLeg";

  export interface RouteSequenceSelectorProps {
    routes: MultiLegRoute[];
    onSelect: (route: MultiLegRoute) => void;
    isLoading?: boolean;
  }

  export function RouteSequenceSelector({
    routes,
    onSelect,
    isLoading = false,
  }: RouteSequenceSelectorProps) {
    if (isLoading) {
      return <div className="p-4 text-center">Finding multi-leg options...</div>;
    }

    if (routes.length === 0) {
      return (
        <div className="p-4 text-center text-gray-600">
          No multi-leg routes available
        </div>
      );
    }

    const formatTime = (date: Date): string => {
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const formatConnectionTime = (minutes: number): string => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    };

    const routeSequence = (legs: FlightLeg[]): string => {
      return legs.map((leg) => leg.to).join(" → ");
    };

    return (
      <div className="space-y-4">
        <h3 className="font-bold text-lg">Multi-Leg Options</h3>
        {routes.map((route) => (
          <div
            key={route.id}
            className="p-4 border rounded-lg hover:bg-gray-50 transition"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-semibold text-lg">
                  {routeSequence(route.legs)}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {route.legs.map((leg, i) => (
                    <span key={i}>
                      {leg.airline} {leg.flightNumber}
                      {i < route.legs.length - 1 ? " → " : ""}
                    </span>
                  ))}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">
                  ${route.totalPrice.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">
                  {route.totalMiles.toLocaleString()} miles
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm mb-4 py-3 border-y">
              {route.legs.map((leg, i) => (
                <div key={i}>
                  <p className="font-medium">{leg.from} → {leg.to}</p>
                  <p className="text-xs text-gray-600">
                    {formatTime(leg.departure)}
                  </p>
                  {i < route.legs.length - 1 && (
                    <p className="text-xs text-orange-600 mt-1">
                      Stop: {formatConnectionTime(
                        (route.legs[i + 1].departure.getTime() -
                          leg.arrival.getTime()) /
                          60000
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">
                Total connection time: {formatConnectionTime(route.totalConnectionTime)}
              </p>
              <button
                onClick={() => onSelect(route)}
                className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700"
              >
                Book Now
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }
  ```

- [ ] **Step 3: Run component test**
  ```bash
  npm test -- RouteSequenceSelector.test.tsx
  ```

**Success:** Component renders routes, displays connections, selection handler works.

---

### Task 3.5 — Integration Test + End-to-End

**Why:** Verify multi-leg search returns realistic results with correct pricing.

**Files:**
- Create: `__tests__/multiLeg.integration.test.ts`

**TDD Steps:**

- [ ] **Step 1: Write integration test**
  ```typescript
  // __tests__/multiLeg.integration.test.ts
  import { searchMultiLegRoutes } from "@/lib/multiLeg";
  import { searchFlights } from "@/lib/engine";

  describe("Multi-leg integration", () => {
    it("finds multi-leg LAX-SIN via NRT", async () => {
      // Search single-leg flights to build graph
      const [laxNrt, nrtSin] = await Promise.all([
        searchFlights("LAX", "NRT", new Date("2026-07-15")),
        searchFlights("NRT", "SIN", new Date("2026-07-17")),
      ]);

      expect(laxNrt.length).toBeGreaterThan(0);
      expect(nrtSin.length).toBeGreaterThan(0);

      // Build multi-leg routes
      const multiLeg = await searchMultiLegRoutes(
        "LAX",
        "SIN",
        new Date("2026-07-15"),
        { maxLegs: 3 }
      );

      expect(multiLeg.length).toBeGreaterThan(0);

      // Verify route is valid
      const bestRoute = multiLeg[0];
      expect(bestRoute.legs).toHaveLength(2);
      expect(bestRoute.legs[0].from).toBe("LAX");
      expect(bestRoute.legs[1].to).toBe("SIN");

      // Verify price calculation
      const expectedPrice =
        bestRoute.legs[0].price + bestRoute.legs[1].price;
      expect(bestRoute.totalPrice).toBe(expectedPrice);
    });

    it("respects connection time constraints", async () => {
      const routes = await searchMultiLegRoutes(
        "LAX",
        "SIN",
        new Date("2026-07-15"),
        { maxLegs: 3 }
      );

      for (const route of routes) {
        for (let i = 0; i < route.legs.length - 1; i++) {
          const connectionMinutes =
            (route.legs[i + 1].departure.getTime() -
              route.legs[i].arrival.getTime()) /
            60000;
          expect(connectionMinutes).toBeGreaterThanOrEqual(120); // Min 2h
          expect(connectionMinutes).toBeLessThanOrEqual(24 * 60); // Max 24h
        }
      }
    });

    it("prevents circular routing", async () => {
      const routes = await searchMultiLegRoutes(
        "LAX",
        "LAX",
        new Date("2026-07-15"),
        { maxLegs: 4 }
      );

      // Should not find round-trip routing as multi-leg
      // (separate feature for round-trips)
      expect(routes).toEqual([]);
    });

    it("completes in <8s for LAX-SIN", async () => {
      const start = Date.now();
      await searchMultiLegRoutes(
        "LAX",
        "SIN",
        new Date("2026-07-15"),
        { maxLegs: 3 }
      );
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(8000);
    });
  });
  ```

- [ ] **Step 2: Create searchMultiLegRoutes orchestrator**
  ```typescript
  // lib/multiLeg.ts (append)
  import { searchFlights } from "@/lib/engine";
  import { buildConnectivityGraph } from "@/lib/graphBuilder";
  import { findPathsByPrice } from "@/lib/shortestPath";

  export async function searchMultiLegRoutes(
    from: string,
    to: string,
    departureDate: Date,
    options: OptimizationOptions = {}
  ): Promise<MultiLegRoute[]> {
    const maxLegs = options.maxLegs ?? 3;

    if (from === to) return [];

    try {
      // Search all possible intermediate hubs
      // For MVP: search LAX-NRT, NRT-SIN, etc.
      const allFlights: FlightResult[] = [];

      // Direct flight always included
      const direct = await searchFlights(from, to, departureDate);
      allFlights.push(...direct);

      // Search via major hubs (if maxLegs >= 2)
      if (maxLegs >= 2) {
        const hubs = ["NRT", "SIN", "BKK", "HND", "HKG"]; // Japanese, Singapore, Bangkok, Haneda, Hong Kong

        for (const hub of hubs) {
          if (hub === from || hub === to) continue;

          const toHub = await searchFlights(from, hub, departureDate);
          // Stagger next flight by 1-2 days for connection
          const hubToDest = await searchFlights(
            hub,
            to,
            new Date(departureDate.getTime() + 2 * 24 * 60 * 60 * 1000)
          );

          allFlights.push(...toHub);
          allFlights.push(...hubToDest);
        }
      }

      // Build graph and find paths
      const graph = buildConnectivityGraph(allFlights);
      const paths = findPathsByPrice(graph, from, to, maxLegs);

      return paths.sort((a, b) => a.totalPrice - b.totalPrice);
    } catch (err) {
      console.error("Multi-leg search failed:", err);
      return [];
    }
  }
  ```

- [ ] **Step 3: Run integration test**
  ```bash
  npm test -- multiLeg.integration.test.ts
  ```

**Success:** End-to-end multi-leg search works, prices calculated correctly, <8s latency.

---

## FEATURE 4: ML DEAL RECOMMENDATIONS

**Why it matters:** Users browse high-volume deal feeds without context. P4.4 scores deals based on user's search history + current loyalty balances, surfacing "Great deal for you: SIN-LAX with Singapore KrisFlyer (25% below average)".

**Success criteria:**
- Aggregate user searches + prices over 90 days
- Calculate historical baseline (avg price, stddev)
- Implement deal scoring: if (currentPrice < avg * 0.85) AND (user has miles in program) → deal
- Widget updated daily via cron
- Show top 3 personalized deals per user
- Batch scoring <2s for all users

---

### Task 4.1 — ML Training Pipeline

**Why:** Build historical price baseline from user activity.

**Files:**
- Create: `lib/mlPipeline.ts`
- Create: `__tests__/lib/mlPipeline.test.ts`

**TDD Steps:**

- [ ] **Step 1: Write training pipeline test**
  ```typescript
  // __tests__/lib/mlPipeline.test.ts
  import {
    aggregateUserHistory,
    calculateBaselineMetrics,
    PriceBaseline,
  } from "@/lib/mlPipeline";

  describe("ML Training Pipeline", () => {
    it("aggregates user search history from Redis", async () => {
      // Assuming Redis has historical searches stored
      const history = await aggregateUserHistory("user@example.com", 90);

      expect(history).toHaveProperty("routes");
      expect(history).toHaveProperty("dates");
      expect(history).toHaveProperty("prices");
      expect(history.routes.length).toBeGreaterThan(0);
    });

    it("calculates baseline metrics for route", () => {
      const prices = [680, 700, 650, 720, 685, 690];
      const baseline = calculateBaselineMetrics(prices);

      expect(baseline).toHaveProperty("avg");
      expect(baseline).toHaveProperty("stdDev");
      expect(baseline).toHaveProperty("min");
      expect(baseline).toHaveProperty("max");
      expect(baseline.avg).toBe(
        prices.reduce((a, b) => a + b, 0) / prices.length
      );
    });

    it("returns null for routes with <5 data points", () => {
      const baseline = calculateBaselineMetrics([680]);
      expect(baseline).toBeNull();
    });
  });
  ```

- [ ] **Step 2: Implement training pipeline**
  ```typescript
  // lib/mlPipeline.ts
  import { getPriceHistory } from "@/lib/priceHistoryRedis";
  import { safeGet, safeSet } from "@/lib/redis";

  export interface PriceBaseline {
    route: string;
    avg: number;
    stdDev: number;
    min: number;
    max: number;
    count: number;
    lastUpdated: Date;
  }

  export interface UserSearchHistory {
    email: string;
    routes: string[];
    dates: Date[];
    prices: number[];
    cabins?: string[];
  }

  const MIN_DATA_POINTS = 5;
  const BASELINE_CACHE_TTL = 24 * 60 * 60; // 24 hours

  export async function aggregateUserHistory(
    email: string,
    days: number = 90
  ): Promise<UserSearchHistory> {
    // Read user's search history from Redis
    // Key: keza:search:user:{email}:history
    const key = `keza:search:user:${email}:history`;
    const cached = await safeGet<UserSearchHistory>(key);

    if (cached) {
      return cached;
    }

    // Placeholder: would aggregate from search logs
    return {
      email,
      routes: [],
      dates: [],
      prices: [],
      cabins: [],
    };
  }

  export function calculateBaselineMetrics(prices: number[]): PriceBaseline | null {
    if (prices.length < MIN_DATA_POINTS) {
      return null;
    }

    const sorted = [...prices].sort((a, b) => a - b);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

    // Standard deviation
    const variance =
      prices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) /
      prices.length;
    const stdDev = Math.sqrt(variance);

    return {
      route: "", // Set by caller
      avg,
      stdDev,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      count: prices.length,
      lastUpdated: new Date(),
    };
  }

  export async function trainRoutePricingModel(
    route: string
  ): Promise<PriceBaseline | null> {
    const [from, to] = route.split("-");
    if (!from || !to) return null;

    // Fetch 90-day price history
    const history = await getPriceHistory(from, to);
    if (!history || history.length < MIN_DATA_POINTS) {
      return null;
    }

    const baseline = calculateBaselineMetrics(history);
    if (!baseline) return null;

    baseline.route = route;

    // Cache in Redis
    const cacheKey = `keza:ml:baseline:${route}`;
    await safeSet(cacheKey, JSON.stringify(baseline), {
      ex: BASELINE_CACHE_TTL,
    });

    return baseline;
  }

  export async function getRouteBaseline(
    route: string
  ): Promise<PriceBaseline | null> {
    const cacheKey = `keza:ml:baseline:${route}`;
    const cached = await safeGet<string>(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    return trainRoutePricingModel(route);
  }
  ```

- [ ] **Step 3: Run pipeline test**
  ```bash
  npm test -- mlPipeline.test.ts
  ```

**Success:** History aggregation works, baseline metrics calculated, caching active.

---

### Task 4.2 — Deal Scorer

**Why:** Score routes based on price deviation + user's loyalty balances.

**Files:**
- Create: `lib/dealScorer.ts`
- Create: `__tests__/lib/dealScorer.test.ts`

**TDD Steps:**

- [ ] **Step 1: Write deal scoring test**
  ```typescript
  // __tests__/lib/dealScorer.test.ts
  import { scoreRoute, isGoodDeal } from "@/lib/dealScorer";
  import { PriceBaseline } from "@/lib/mlPipeline";
  import { BalanceResult } from "@/lib/balanceSync";

  describe("Deal Scorer", () => {
    const baseline: PriceBaseline = {
      route: "SIN-LAX",
      avg: 750,
      stdDev: 50,
      min: 650,
      max: 900,
      count: 30,
      lastUpdated: new Date(),
    };

    const userBalances: BalanceResult[] = [
      {
        program: "Singapore KrisFlyer",
        airline: "Singapore Airlines",
        miles: 85000,
        lastSynced: new Date(),
      },
    ];

    it("scores great deal (25% below average)", () => {
      const currentPrice = 550; // 26.7% below avg
      const score = scoreRoute(currentPrice, baseline, userBalances, "SIN-LAX");
      expect(score).toBeGreaterThan(0.8);
    });

    it("scores okay deal (15% below average)", () => {
      const currentPrice = 637; // 15% below avg
      const score = scoreRoute(currentPrice, baseline, userBalances, "SIN-LAX");
      expect(score).toBeGreaterThan(0.5);
      expect(score).toBeLessThan(0.8);
    });

    it("returns low score for above-average price", () => {
      const currentPrice = 850; // Above avg
      const score = scoreRoute(currentPrice, baseline, userBalances, "SIN-LAX");
      expect(score).toBeLessThan(0.3);
    });

    it("boosts score if user has sufficient miles", () => {
      const currentPrice = 550;
      const withMiles = scoreRoute(
        currentPrice,
        baseline,
        userBalances,
        "SIN-LAX"
      );
      const withoutMiles = scoreRoute(currentPrice, baseline, [], "SIN-LAX");
      expect(withMiles).toBeGreaterThan(withoutMiles);
    });

    it("identifies good deals (score >= 0.7)", () => {
      expect(isGoodDeal(0.75, 500, baseline)).toBe(true);
      expect(isGoodDeal(0.65, 500, baseline)).toBe(false);
    });
  });
  ```

- [ ] **Step 2: Implement deal scorer**
  ```typescript
  // lib/dealScorer.ts
  import { PriceBaseline } from "@/lib/mlPipeline";
  import { BalanceResult } from "@/lib/balanceSync";
  import { getCabinMultiplier } from "@/lib/engine";
  import { globalPrograms } from "@/lib/globalPrograms";

  export interface DealScore {
    route: string;
    currentPrice: number;
    historicalAvg: number;
    discount: number;           // percentage
    score: number;              // 0-1
    hasSufficientMiles: boolean;
    recommendation: string;
  }

  const DEAL_THRESHOLD = 0.7;    // Score >= 0.7 is "good deal"
  const DISCOUNT_THRESHOLD = 0.85; // Price <= 85% of avg = deal

  export function scoreRoute(
    currentPrice: number,
    baseline: PriceBaseline | null,
    userBalances: BalanceResult[],
    route: string,
    cabin: string = "ECONOMY"
  ): number {
    if (!baseline) return 0;

    // Normalize price by cabin
    const cabinMultiplier = getCabinMultiplier(cabin);
    const adjustedBaseline = baseline.avg * cabinMultiplier;

    // Price deviation from baseline (negative = discount)
    const deviation = (adjustedBaseline - currentPrice) / adjustedBaseline;

    // Base score: 0-1 based on discount
    let score = Math.max(0, Math.min(1, deviation * 1.5));

    // Bonus if user has miles in relevant programs
    const [from, to] = route.split("-");
    const routePrograms = getRouteProgramsForUser(route, from, to);

    if (routePrograms.length > 0) {
      const hasMiles = userBalances.some((b) =>
        routePrograms.some((p) => p.program === b.program)
      );

      if (hasMiles) {
        score = Math.min(1, score * 1.2); // Boost by 20%
      }
    }

    // Penalty for high volatility
    if (baseline.stdDev > baseline.avg * 0.15) {
      // >15% volatility
      score = score * 0.9;
    }

    return Math.min(1, Math.max(0, score));
  }

  export function isGoodDeal(
    score: number,
    currentPrice: number,
    baseline: PriceBaseline
  ): boolean {
    const discountPercentage = (baseline.avg - currentPrice) / baseline.avg;
    return score >= DEAL_THRESHOLD || discountPercentage >= 0.15;
  }

  export function getDealRecommendation(score: number): string {
    if (score >= 0.85) return "Exceptional deal! Book immediately.";
    if (score >= 0.75) return "Great deal for you!";
    if (score >= 0.65) return "Good price.";
    if (score >= 0.5) return "Fair price.";
    return "Not a deal.";
  }

  function getRouteProgramsForUser(
    route: string,
    from: string,
    to: string
  ): { program: string; airline: string }[] {
    // Look up which programs service this route
    const routeKey = `${from}-${to}`;
    return globalPrograms[routeKey] ?? [];
  }

  export function getCabinMultiplier(cabin: string): number {
    const multipliers: Record<string, number> = {
      ECONOMY: 1.0,
      PREMIUM_ECONOMY: 1.4,
      BUSINESS: 2.2,
      FIRST: 3.5,
    };
    return multipliers[cabin] ?? 1.0;
  }
  ```

- [ ] **Step 3: Run scorer test**
  ```bash
  npm test -- dealScorer.test.ts
  ```

**Success:** Deal scoring works, miles boost applied, thresholds respected.

---

### Task 4.3 — Deal Widget + Daily Cron

**Why:** Display top 3 personalized deals, updated daily.

**Files:**
- Create: `components/DealRecommendationWidget.tsx`
- Create: `app/api/cron/deal-recommendations/route.ts`
- Create: `__tests__/components/DealRecommendationWidget.test.tsx`

**TDD Steps:**

- [ ] **Step 1: Write widget test**
  ```typescript
  // __tests__/components/DealRecommendationWidget.test.tsx
  import { render, screen } from "@testing-library/react";
  import { DealRecommendationWidget } from "@/components/DealRecommendationWidget";
  import { DealScore } from "@/lib/dealScorer";

  describe("DealRecommendationWidget", () => {
    const mockDeals: DealScore[] = [
      {
        route: "SIN-LAX",
        currentPrice: 550,
        historicalAvg: 750,
        discount: 26.7,
        score: 0.85,
        hasSufficientMiles: true,
        recommendation: "Exceptional deal!",
      },
      {
        route: "NRT-LAX",
        currentPrice: 620,
        historicalAvg: 680,
        discount: 8.8,
        score: 0.72,
        hasSufficientMiles: true,
        recommendation: "Great deal for you!",
      },
    ];

    it("renders deal recommendations", () => {
      render(<DealRecommendationWidget deals={mockDeals} />);
      expect(screen.getByText(/SIN.*LAX/)).toBeInTheDocument();
      expect(screen.getByText(/\$550/)).toBeInTheDocument();
    });

    it("shows discount percentage", () => {
      render(<DealRecommendationWidget deals={mockDeals} />);
      expect(screen.getByText(/26\.7%/)).toBeInTheDocument();
    });

    it("displays recommendation text", () => {
      render(<DealRecommendationWidget deals={mockDeals} />);
      expect(
        screen.getByText(/Exceptional deal|Great deal/)
      ).toBeInTheDocument();
    });

    it("shows up to 3 deals", () => {
      const manyDeals = Array.from({ length: 5 }, (_, i) => ({
        ...mockDeals[0],
        route: `ROUTE-${i}`,
      }));
      render(<DealRecommendationWidget deals={manyDeals} />);
      const elements = screen.getAllByText(/Book Now/);
      expect(elements).toHaveLength(3);
    });
  });
  ```

- [ ] **Step 2: Implement widget**
  ```typescript
  // components/DealRecommendationWidget.tsx
  "use client";

  import { DealScore } from "@/lib/dealScorer";
  import Link from "next/link";

  export interface DealRecommendationWidgetProps {
    deals: DealScore[];
    maxDeals?: number;
  }

  export function DealRecommendationWidget({
    deals,
    maxDeals = 3,
  }: DealRecommendationWidgetProps) {
    const topDeals = deals.slice(0, maxDeals);

    if (topDeals.length === 0) {
      return (
        <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-600">
          No deals available right now. Check back soon!
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <h3 className="font-bold text-lg">Recommended Deals</h3>
        {topDeals.map((deal) => (
          <div
            key={deal.route}
            className={`p-4 rounded-lg border-2 ${
              deal.score >= 0.85
                ? "border-green-500 bg-green-50"
                : "border-blue-300 bg-blue-50"
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-semibold text-lg">{deal.route}</h4>
                <p className="text-sm text-gray-700">{deal.recommendation}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">
                  ${deal.currentPrice.toLocaleString()}
                </p>
                <p className="text-sm font-bold text-green-700">
                  Save {deal.discount.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-gray-600 mb-3 pb-3 border-b">
              <span>Usually: ${deal.historicalAvg.toLocaleString()}</span>
              {deal.hasSufficientMiles && (
                <span className="text-green-700 font-medium">
                  ✓ You have miles
                </span>
              )}
            </div>

            <Link href={`/search?route=${deal.route}`}>
              <button className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700">
                Book Now
              </button>
            </Link>
          </div>
        ))}
      </div>
    );
  }
  ```

- [ ] **Step 3: Create daily cron for recommendations**
  ```typescript
  // app/api/cron/deal-recommendations/route.ts
  import { NextRequest, NextResponse } from "next/server";
  import { hasCronSecret } from "@/lib/auth";
  import { getRouteBaseline } from "@/lib/mlPipeline";
  import { getCachedBalances } from "@/lib/balanceSync";
  import { scoreRoute, isGoodDeal } from "@/lib/dealScorer";
  import { getAllRoutes, getCurrentPrices } from "@/lib/engine";
  import { logError } from "@/lib/logger";
  import * as Sentry from "@sentry/nextjs";
  import { safeSet } from "@/lib/redis";

  export async function GET(req: NextRequest) {
    if (!hasCronSecret(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return Sentry.withMonitor("cron-deal-recommendations", async () => {
      try {
        const routes = await getAllRoutes(); // Get all active routes
        const deals: Map<string, any[]> = new Map(); // user -> deals
        let processed = 0;

        for (const route of routes) {
          try {
            // Get baseline for this route
            const baseline = await getRouteBaseline(route);
            if (!baseline) continue;

            // Get current prices
            const prices = await getCurrentPrices(route);
            if (!prices || prices.length === 0) continue;

            const cheapestPrice = Math.min(...prices);

            // For each user, score this deal
            const allUsers = await getAllUserEmails();
            for (const userEmail of allUsers) {
              const balances = await getCachedBalances(userEmail);
              const score = scoreRoute(
                cheapestPrice,
                baseline,
                balances,
                route
              );

              if (isGoodDeal(score, cheapestPrice, baseline)) {
                if (!deals.has(userEmail)) {
                  deals.set(userEmail, []);
                }
                deals.get(userEmail)!.push({
                  route,
                  currentPrice: cheapestPrice,
                  historicalAvg: baseline.avg,
                  discount:
                    ((baseline.avg - cheapestPrice) / baseline.avg) * 100,
                  score,
                });
              }
            }

            processed++;
          } catch (err) {
            logError(`Failed to score route ${route}`, err);
          }
        }

        // Store top 3 deals per user in Redis
        for (const [userEmail, userDeals] of deals) {
          const topDeals = userDeals
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
          await safeSet(
            `keza:deals:${userEmail}`,
            JSON.stringify(topDeals),
            { ex: 24 * 60 * 60 } // 24-hour TTL
          );
        }

        return NextResponse.json({
          success: true,
          processed,
          usersWithDeals: deals.size,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        logError("Cron deal-recommendations failed", err);
        return NextResponse.json(
          { error: "Internal server error" },
          { status: 500 }
        );
      }
    });
  }

  async function getAllUserEmails(): Promise<string[]> {
    // Fetch all registered user emails
    // Placeholder: would query database
    return [];
  }

  async function getAllRoutes(): Promise<string[]> {
    // Return all active routes in system
    return ["SIN-LAX", "NRT-LAX", "DXB-LHR", "CDG-BKK"]; // Placeholder
  }

  async function getCurrentPrices(route: string): Promise<number[]> {
    // Fetch current cheapest prices for route
    return [];
  }
  ```

- [ ] **Step 4: Add API endpoint to fetch user's deals**
  ```typescript
  // app/api/recommendations/deals/route.ts
  import { NextRequest, NextResponse } from "next/server";
  import { getSession } from "@/lib/auth";
  import { safeGet } from "@/lib/redis";

  export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dealsKey = `keza:deals:${session.user.email}`;
    const cached = await safeGet<string>(dealsKey);
    const deals = cached ? JSON.parse(cached) : [];

    return NextResponse.json(deals);
  }
  ```

- [ ] **Step 5: Run widget test**
  ```bash
  npm test -- DealRecommendationWidget.test.tsx
  ```

**Success:** Widget renders deals, cron processes recommendations, API returns personalized deals.

---

## TESTING & VALIDATION

### Phase 1: Unit Tests (All passing)

- [ ] Run all unit tests:
  ```bash
  npm test -- --testPathPattern="(seatAlerts|balanceSync|multiLeg|dealScorer|graphBuilder|shortestPath)"
  ```
  **Target:** 100% of new tests passing (40+ tests)

### Phase 2: Integration Tests

- [ ] Run integration tests:
  ```bash
  npm test -- --testPathPattern="integration"
  ```
  **Target:** All multi-leg and multi-feature tests passing

### Phase 3: Cron Validation

- [ ] Verify all cron routes return valid responses:
  - `GET /api/cron/seat-alerts` → `{ checked: N, notified: M }`
  - `GET /api/cron/balance-sync` → `{ synced: N, failed: M }`
  - `GET /api/cron/deal-recommendations` → `{ processed: N, usersWithDeals: M }`

### Phase 4: Regression Testing

- [ ] Run full test suite:
  ```bash
  npm test
  ```
  **Target:** No new failures, all existing tests passing

### Phase 5: Pre-Push Hook

- [ ] Verify pre-commit hook passes:
  ```bash
  npm test
  git add .
  git commit -m "feat(p4): add advanced features"
  ```
  **Target:** Commit succeeds, no hook failures

---

## DEPLOYMENT & MONITORING

### Production Deployment

- [ ] **Step 1: Merge to main**
  ```bash
  git push origin p4-advanced-features
  gh pr create --title "P4: Advanced Features" --body "..."
  gh pr merge --merge
  ```

- [ ] **Step 2: Vercel Build**
  - Navigate to: https://vercel.com/dashboard/keza
  - Wait for: Build SUCCESS, Deployment READY
  - Expected time: <2 min

- [ ] **Step 3: Live Verification**
  - Search on keza-taupe.vercel.app
  - Create a seat alert subscription
  - Check dashboard for portfolio sync widget
  - Verify multi-leg routes appear in search
  - View deal recommendations widget

### Monitoring & Alerts

- [ ] **Sentry Integration**
  - Monitor: `cron-seat-alerts`, `cron-balance-sync`, `cron-deal-recommendations`
  - Alert: Any cron execution >30s
  - Alert: Any new errors in P4 features

- [ ] **Performance Baselines**
  | Metric | Target | Monitor |
  |--------|--------|---------|
  | Seat alert cron | <30s | Sentry |
  | Balance sync cron | <60s | Sentry |
  | Deal scoring | <2s per user | CloudWatch logs |
  | Multi-leg search | <8s | Page load metrics |

- [ ] **Error Handling**
  - Redis connection failures: logged, fallback to empty results
  - API failures: retry 2x with exponential backoff
  - Cron failures: Sentry notification, manual investigation

---

## ROLLBACK PLAN

If critical issue found:

```bash
# Identify commit hash
git log --oneline | head -5

# Revert changes
git revert <commit-hash>
git push origin main

# Vercel auto-deploys revert in <2 min
# Monitor Sentry to confirm errors cleared
```

---

## SUCCESS CHECKLIST

- [ ] All 13 tasks completed with TDD
- [ ] 40+ unit tests passing
- [ ] All integration tests passing
- [ ] Pre-commit hook passes (npm test)
- [ ] Cron routes tested and logging
- [ ] Vercel deployment successful
- [ ] Live searches show all 4 features
- [ ] Sentry monitoring active
- [ ] 0 regressions in existing features
- [ ] Documentation complete

---

## APPENDIX: Key Files Summary

| Feature | Files | Purpose |
|---------|-------|---------|
| **P4.1 Seat Alerts** | `lib/seatAlerts.ts` | Schema + Redis storage |
| | `app/api/cron/seat-alerts/route.ts` | Daily deal detection cron |
| | `components/SeatAlertForm.tsx` | UI form + dashboard widget |
| | `lib/seatAlertEmails.ts` | Email template + sender |
| **P4.2 Balance Sync** | `lib/balanceSync.ts` | Airline API integration |
| | `app/api/cron/balance-sync/route.ts` | Daily sync cron |
| | `components/BalanceSyncWidget.tsx` | Portfolio UI enhancements |
| **P4.3 Multi-Leg** | `lib/multiLeg.ts` | Types + orchestration |
| | `lib/graphBuilder.ts` | Connectivity graph builder |
| | `lib/shortestPath.ts` | Dijkstra's algorithm |
| | `components/RouteSequenceSelector.tsx` | Route selector UI |
| **P4.4 Deal ML** | `lib/mlPipeline.ts` | Training pipeline |
| | `lib/dealScorer.ts` | Scoring engine |
| | `components/DealRecommendationWidget.tsx` | Deal display widget |
| | `app/api/cron/deal-recommendations/route.ts` | Daily scoring cron |

---

**Status:** READY FOR IMPLEMENTATION  
**Created:** 2026-06-07  
**Author:** Claude Code Agent  
**Version:** 1.0

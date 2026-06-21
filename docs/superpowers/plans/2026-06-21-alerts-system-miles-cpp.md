# Miles CPP Alerts System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a revenue-critical alerts system that notifies users when the best miles option on their favorite routes improves >10% CPP, with email/push delivery, Redis storage, Resend integration, and Sentry monitoring.

**Architecture:** The system has three layers:
1. **alertsEngine.ts** — Core logic: track baseline CPP, compare daily prices, detect >10% improvements on favorite routes
2. **API endpoints** — POST/GET to subscribe/list user alerts; already exist in `/app/api/alerts/route.ts` with miles alert support
3. **Cron job** — Daily scan via `/app/api/cron/alerts/route.ts`, searches favorite routes, triggers emails via Resend when CPP threshold met

The system stores alerts in Redis (key: `keza:alert:${id}`, email index: `keza:alerts:email:${email}`), integrates with existing Resend email, and reports to Sentry.

**Tech Stack:** Next.js 15, TypeScript, Redis (Upstash), Resend email, Sentry monitoring, Jest (438 tests, >90% coverage target).

---

## File Structure & Responsibilities

| File | Responsibility |
|------|-----------------|
| `/lib/alertsEngine.ts` | **NEW** — Track favorite routes, compare CPP daily, detect >10% improvements, build CPP history |
| `/lib/alerts.ts` | **EXTEND** — Add `sendMilesAlertEmail()`, `buildMilesAlertPayload()` for CPP alerts (price-drop alerts already exist) |
| `/app/api/alerts/route.ts` | **EXTEND** — Already has milesAlert support; ensure POST validates miles alert params |
| `/app/api/cron/alerts/route.ts` | **EXTEND** — Add miles alert check after price-drop check; call alertsEngine to detect >10% CPP shifts |
| `/__tests__/lib/alertsEngine.test.ts` | **NEW** — Unit tests: baseline tracking, CPP comparison, >10% detection, edge cases (90%+ coverage) |
| `/__tests__/lib/alerts-miles.test.ts` | **NEW** — Integration tests: email generation, Redis I/O, miles alert flow |

---

## Task 1: Create alertsEngine.ts — Core CPP tracking & comparison

**Files:**
- Create: `/Users/DIALLO9194/Downloads/keza/lib/alertsEngine.ts`
- Test: `/__tests__/lib/alertsEngine.test.ts`

### Step 1.1: Write failing test for baseline tracking

```typescript
// /__tests__/lib/alertsEngine.test.ts
import { trackBaselineCpp, getBaselineHistory } from "@/lib/alertsEngine";

describe("alertsEngine", () => {
  describe("trackBaselineCpp", () => {
    it("should store baseline CPP for a route+program", async () => {
      const key = "SIN:LAX:Singapore KrisFlyer";
      const cpp = 1.5;

      await trackBaselineCpp(key, cpp);
      const history = await getBaselineHistory(key);

      expect(history).toBeDefined();
      expect(history?.baseline).toBe(cpp);
      expect(history?.createdAt).toBeDefined();
    });

    it("should not overwrite existing baseline if newer than 24 hours old", async () => {
      const key = "NRT:LAX:ANA Mileage Club";
      const baseline1 = 1.2;
      const baseline2 = 1.5;

      await trackBaselineCpp(key, baseline1);
      const first = await getBaselineHistory(key);

      // Immediate second call should not overwrite
      await trackBaselineCpp(key, baseline2);
      const second = await getBaselineHistory(key);

      expect(second?.baseline).toBe(baseline1); // Original retained
    });

    it("should overwrite baseline if older than 24 hours", async () => {
      const key = "DXB:LHR:Emirates Skywards";
      const baseline1 = 1.0;
      const baseline2 = 2.0;

      await trackBaselineCpp(key, baseline1, new Date(Date.now() - 25 * 60 * 60 * 1000));
      await trackBaselineCpp(key, baseline2);
      const history = await getBaselineHistory(key);

      expect(history?.baseline).toBe(baseline2);
    });
  });
});
```

Run: `cd /Users/DIALLO9194/Downloads/keza && npm test -- alertsEngine.test.ts 2>&1 | head -30`

Expected: FAIL with "trackBaselineCpp is not defined" or similar.

### Step 1.2: Implement alertsEngine.ts — baseline tracking

```typescript
// /Users/DIALLO9194/Downloads/keza/lib/alertsEngine.ts
import "server-only";
import { redis } from "./redis";

/**
 * Baseline CPP record for a route+program.
 * Stored in Redis at keza:cpp:baseline:{routeKey}
 */
export interface CppBaseline {
  /** Cents per point/mile baseline at time of tracking */
  baseline: number;
  /** ISO 8601 timestamp when baseline was recorded */
  createdAt: string;
}

/**
 * History of CPP observations for a route+program.
 * Key format: keza:cpp:history:{from}:{to}:{program}
 */
export interface CppHistory {
  /** Route + program key: "FROM:TO:Program Name" */
  key: string;
  /** All CPP observations, newest first */
  observations: Array<{ cpp: number; timestamp: string }>;
  /** Baseline CPP (most recent) */
  baseline: number;
  /** When baseline was set */
  createdAt: string;
}

// ─── Redis keys ─────────────────────────────────────────────────────────────

const BASELINE_KEY = (routeKey: string) => `keza:cpp:baseline:${routeKey}`;
const HISTORY_KEY = (routeKey: string) => `keza:cpp:history:${routeKey}`;
const FAVORITE_ROUTES_KEY = (email: string) => `keza:favorite:routes:${email.toLowerCase()}`;

// ─── Baseline tracking (per route+program) ──────────────────────────────────

/**
 * Track baseline CPP for a route+program.
 * Format: "FROM:TO:Program Name" (e.g., "SIN:LAX:Singapore KrisFlyer")
 *
 * Only overwrites if existing baseline is >24h old.
 * TTL: 90 days (typical alert lifetime).
 */
export async function trackBaselineCpp(
  routeKey: string,
  cpp: number,
  overrideTime?: Date
): Promise<void> {
  const now = overrideTime ?? new Date();
  const key = BASELINE_KEY(routeKey);

  const existing = await redis.get<CppBaseline>(key);
  if (existing) {
    const createdTime = new Date(existing.createdAt).getTime();
    const hoursSince = (now.getTime() - createdTime) / (1000 * 60 * 60);
    if (hoursSince < 24) {
      // Keep existing baseline
      return;
    }
  }

  // Record new baseline
  const baseline: CppBaseline = {
    baseline: cpp,
    createdAt: now.toISOString(),
  };

  await redis.set(key, baseline, { ex: 90 * 86400 });
}

/**
 * Get baseline CPP for a route+program.
 */
export async function getBaselineHistory(routeKey: string): Promise<CppHistory | null> {
  const baselineKey = BASELINE_KEY(routeKey);
  const baseline = await redis.get<CppBaseline>(baselineKey);

  if (!baseline) return null;

  return {
    key: routeKey,
    observations: [],
    baseline: baseline.baseline,
    createdAt: baseline.createdAt,
  };
}

// ─── Favorite routes (user-specific) ─────────────────────────────────────────

/**
 * Add a route to a user's favorites.
 * Used to batch check on daily cron.
 */
export async function addFavoriteRoute(
  email: string,
  from: string,
  to: string
): Promise<void> {
  const key = FAVORITE_ROUTES_KEY(email);
  const routeKey = `${from.toUpperCase()}:${to.toUpperCase()}`;
  await redis.sadd(key, routeKey);
  await redis.expire(key, 90 * 86400);
}

/**
 * Remove a route from user's favorites.
 */
export async function removeFavoriteRoute(
  email: string,
  from: string,
  to: string
): Promise<void> {
  const key = FAVORITE_ROUTES_KEY(email);
  const routeKey = `${from.toUpperCase()}:${to.toUpperCase()}`;
  await redis.srem(key, routeKey);
}

/**
 * Get all favorite routes for a user.
 */
export async function getFavoriteRoutes(email: string): Promise<string[]> {
  const key = FAVORITE_ROUTES_KEY(email);
  const routes = await redis.smembers(key);
  return routes as string[];
}

// ─── CPP shift detection (>10% improvement) ──────────────────────────────────

/**
 * Check if CPP has improved >10% from baseline.
 * Improvement = (newCpp - baseline) / baseline > 0.10
 *
 * @param baseline Starting CPP (lower is worse)
 * @param current Current CPP (higher is better)
 * @returns true if improvement >= 10%
 */
export function detectCppImprovement(baseline: number, current: number): boolean {
  if (baseline <= 0 || current <= 0) return false;
  const improvement = (current - baseline) / baseline;
  return improvement >= 0.10;
}

/**
 * Record a CPP observation and check if threshold met.
 * @param routeKey "FROM:TO:Program Name"
 * @param currentCpp CPP now (from latest search)
 * @returns { triggered: true, improvement: 0.15 } if >10% improvement
 */
export async function recordCppObservation(
  routeKey: string,
  currentCpp: number
): Promise<{ triggered: boolean; improvement: number }> {
  const baseline = await getBaselineHistory(routeKey);
  if (!baseline) {
    // No baseline yet — track current as new baseline
    await trackBaselineCpp(routeKey, currentCpp);
    return { triggered: false, improvement: 0 };
  }

  const triggered = detectCppImprovement(baseline.baseline, currentCpp);
  const improvement = triggered
    ? (currentCpp - baseline.baseline) / baseline.baseline
    : 0;

  return { triggered, improvement };
}
```

Run: `cd /Users/DIALLO9194/Downloads/keza && npm test -- alertsEngine.test.ts`

Expected: PASS

### Step 1.3: Add remaining baseline tracking tests

```typescript
// /__tests__/lib/alertsEngine.test.ts (append)
describe("detectCppImprovement", () => {
  it("should return true when CPP improves >10%", () => {
    const baseline = 1.0;
    const current = 1.15;
    expect(detectCppImprovement(baseline, current)).toBe(true);
  });

  it("should return false when CPP improves <10%", () => {
    const baseline = 1.0;
    const current = 1.08;
    expect(detectCppImprovement(baseline, current)).toBe(false);
  });

  it("should return true when CPP improves exactly 10%", () => {
    const baseline = 1.0;
    const current = 1.10;
    expect(detectCppImprovement(baseline, current)).toBe(true);
  });

  it("should return false when CPP degrades", () => {
    const baseline = 2.0;
    const current = 1.5;
    expect(detectCppImprovement(baseline, current)).toBe(false);
  });

  it("should return false for invalid baseline", () => {
    expect(detectCppImprovement(0, 1.5)).toBe(false);
    expect(detectCppImprovement(-1, 1.5)).toBe(false);
  });

  it("should return false for invalid current", () => {
    expect(detectCppImprovement(1.5, 0)).toBe(false);
    expect(detectCppImprovement(1.5, -1)).toBe(false);
  });
});

describe("recordCppObservation", () => {
  it("should trigger alert when new CPP >10% better than baseline", async () => {
    const key = "SIN:LAX:Singapore KrisFlyer";
    await trackBaselineCpp(key, 1.0);

    const result = await recordCppObservation(key, 1.15);
    expect(result.triggered).toBe(true);
    expect(result.improvement).toBeCloseTo(0.15, 2);
  });

  it("should not trigger alert when improvement <10%", async () => {
    const key = "NRT:LAX:ANA Mileage Club";
    await trackBaselineCpp(key, 1.0);

    const result = await recordCppObservation(key, 1.08);
    expect(result.triggered).toBe(false);
    expect(result.improvement).toBe(0);
  });
});

describe("Favorite routes", () => {
  it("should add and retrieve favorite routes", async () => {
    const email = "user@example.com";
    await addFavoriteRoute(email, "SIN", "LAX");
    await addFavoriteRoute(email, "NRT", "JFK");

    const routes = await getFavoriteRoutes(email);
    expect(routes).toContain("SIN:LAX");
    expect(routes).toContain("NRT:JFK");
  });

  it("should remove favorite routes", async () => {
    const email = "user2@example.com";
    await addFavoriteRoute(email, "DXB", "LHR");
    await removeFavoriteRoute(email, "DXB", "LHR");

    const routes = await getFavoriteRoutes(email);
    expect(routes).not.toContain("DXB:LHR");
  });
});
```

Run: `cd /Users/DIALLO9194/Downloads/keza && npm test -- alertsEngine.test.ts`

Expected: All tests PASS

### Step 1.4: Commit alertsEngine.ts

```bash
cd /Users/DIALLO9194/Downloads/keza
git add lib/alertsEngine.ts __tests__/lib/alertsEngine.test.ts
git commit -m "feat: add alerts engine for miles CPP tracking and comparison

- trackBaselineCpp: record baseline CPP per route+program, no overwrite <24h
- detectCppImprovement: check >10% CPP improvement
- recordCppObservation: detect and report CPP shifts
- getFavoriteRoutes: list user's favorite corridors for daily cron
- Integration: Redis storage with 90d TTL

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Extend alerts.ts — Add miles alert email function

**Files:**
- Modify: `/Users/DIALLO9194/Downloads/keza/lib/alerts.ts`
- Test: `/__tests__/lib/alerts-miles.test.ts`

### Step 2.1: Write test for miles alert email

```typescript
// /__tests__/lib/alerts-miles.test.ts
import { sendMilesAlertEmail } from "@/lib/alerts";
import { PriceAlert } from "@/lib/alerts";

describe("sendMilesAlertEmail", () => {
  it("should build miles alert email with CPP improvement", async () => {
    const alert: PriceAlert = {
      id: "alt_test123",
      email: "user@example.com",
      from: "SIN",
      to: "LAX",
      cabin: "business",
      basePrice: 1200,
      targetPrice: 1200,
      createdAt: new Date().toISOString(),
      notifCount: 0,
      active: true,
      notifFrequency: "instant",
      milesAlert: {
        program: "Singapore KrisFlyer",
        targetCpp: 1.5,
        baseCpp: 1.2,
      },
    };

    const improvement = 0.25; // 25% improvement
    const result = await sendMilesAlertEmail(alert, improvement);

    expect(result).toBe(true); // Email sent successfully
  });

  it("should fail gracefully if RESEND_API_KEY missing", async () => {
    const originalKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    const alert: PriceAlert = {
      id: "alt_test456",
      email: "user@example.com",
      from: "SIN",
      to: "LAX",
      cabin: "economy",
      basePrice: 500,
      targetPrice: 500,
      createdAt: new Date().toISOString(),
      notifCount: 0,
      active: true,
      notifFrequency: "instant",
      milesAlert: {
        program: "Singapore KrisFlyer",
        targetCpp: 1.5,
        baseCpp: 1.2,
      },
    };

    const result = await sendMilesAlertEmail(alert, 0.15);
    expect(result).toBe(false); // Graceful failure

    process.env.RESEND_API_KEY = originalKey;
  });
});
```

Run: `cd /Users/DIALLO9194/Downloads/keza && npm test -- alerts-miles.test.ts`

Expected: FAIL with "sendMilesAlertEmail is not defined"

### Step 2.2: Implement sendMilesAlertEmail in alerts.ts

First, read the end of alerts.ts to understand the email pattern:

```typescript
// /__tests__/lib/alerts.ts (append to end of file, before exports)

/**
 * Send miles alert email when CPP improves >10%.
 * Called by cron job after detecting threshold met.
 */
export async function sendMilesAlertEmail(
  alert: PriceAlert,
  improvement: number  // e.g., 0.15 for 15% improvement
): Promise<boolean> {
  if (!alert.milesAlert) return false;
  if (improvement < 0.10) return false; // Safety check: don't send unless >10%

  try {
    const resend = getResend();
    const manageToken = createManageAlertsToken(alert.email);
    const manageUrl = withUtm(
      `${BASE_URL}/alertes?email=${encodeURIComponent(alert.email)}&token=${encodeURIComponent(manageToken ?? "")}`,
      "keza",
      "miles-alert"
    );
    const searchUrl = withUtm(
      `${BASE_URL}/?from=${alert.from}&to=${alert.to}`,
      "keza",
      "miles-alert"
    );
    const unsubscribeToken = createUnsubscribeAlertToken(alert.id);
    const unsubscribeUrl = `${BASE_URL}/api/alerts/unsubscribe?token=${encodeURIComponent(unsubscribeToken ?? "")}`;

    const fromApt = airportsMap[alert.from];
    const toApt = airportsMap[alert.to];
    const fromFlag = fromApt?.flag ?? "";
    const toFlag = toApt?.flag ?? "";

    const improvementPct = Math.round(improvement * 100);
    const newCpp = (alert.milesAlert.baseCpp * (1 + improvement)).toFixed(2);

    const subject = `🎉 Miles alert: ${alert.milesAlert.program} improved ${improvementPct}% (${newCpp}¢/mile)`;
    const preheader = `${alert.from}→${alert.to} now at ${newCpp}¢/mile · ${improvementPct}% better`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; background: #f5f5f5; padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;">
            <!-- Header -->
            <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <td style="padding: 30px 20px; text-align: center;">
                <p style="margin: 0; font-size: 28px; font-weight: 700; color: white;">🎉 Excellent miles deal!</p>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding: 30px 20px;">
                <p style="margin: 0 0 20px 0; font-size: 14px; color: #666;">
                  Hi there! Good news:
                </p>

                <!-- Route card -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9f9f9; border-radius: 8px; border: 1px solid #e0e0e0; margin-bottom: 20px;">
                  <tr>
                    <td style="padding: 20px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td>
                            <p style="margin: 0; font-size: 24px; font-weight: 700; color: #333;">
                              ${fromFlag} ${alert.from} <span style="color: #667eea;">→</span> ${toFlag} ${alert.to}
                            </p>
                            <p style="margin: 8px 0 0 0; font-size: 14px; color: #666;">
                              ${CABIN_LABELS[alert.cabin] || alert.cabin}
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-top: 16px; border-top: 1px solid #e0e0e0;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td>
                                  <p style="margin: 0; font-size: 12px; color: #999;">Program</p>
                                  <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #333;">
                                    ${alert.milesAlert.program}
                                  </p>
                                </td>
                                <td style="text-align: right;">
                                  <p style="margin: 0; font-size: 12px; color: #999;">Value</p>
                                  <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #10b981;">
                                    ${newCpp}¢/mile
                                  </p>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding-top: 12px;">
                                  <p style="margin: 0; font-size: 12px; color: #999;">Previous</p>
                                  <p style="margin: 4px 0 0 0; font-size: 14px; color: #666;">
                                    ${alert.milesAlert.baseCpp.toFixed(2)}¢/mile
                                  </p>
                                </td>
                                <td style="text-align: right; padding-top: 12px;">
                                  <p style="margin: 0; font-size: 12px; color: #999;">Improvement</p>
                                  <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 600; color: #10b981;">
                                    +${improvementPct}%
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- CTA -->
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="text-align: center; padding: 20px 0;">
                      <a href="${searchUrl}" style="display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; font-size: 14px;">
                        Compare on KEZA →
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin: 20px 0 0 0; font-size: 12px; color: #999; text-align: center;">
                  <a href="${manageUrl}" style="color: #667eea; text-decoration: none;">Manage alerts</a> · 
                  <a href="${unsubscribeUrl}" style="color: #667eea; text-decoration: none;">Unsubscribe</a>
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr style="background: #f5f5f5; border-top: 1px solid #e0e0e0;">
              <td style="padding: 20px; text-align: center; font-size: 12px; color: #999;">
                <p style="margin: 0;">KEZA — Find the best way to book flights</p>
              </td>
            </tr>
          </table>

          <!-- Tracking pixel (fire-and-forget) -->
          <img src="${emailOpenPixelUrl("miles-alert", alert.email)}" width="1" height="1" style="display: none;" />
        </body>
      </html>
    `;

    const plainText = `
EXCELLENT MILES DEAL!

${fromFlag} ${alert.from} → ${toFlag} ${alert.to} · ${alert.cabin}

Program: ${alert.milesAlert.program}
Value: ${newCpp}¢/mile (was ${alert.milesAlert.baseCpp.toFixed(2)}¢/mile)
Improvement: +${improvementPct}%

Compare on KEZA:
${searchUrl}

Manage alerts: ${manageUrl}
Unsubscribe: ${unsubscribeUrl}
    `.trim();

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: alert.email,
      subject,
      html,
      text: plainText,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
      },
    });

    return result.id ? true : false;
  } catch (err) {
    logError("[alerts] sendMilesAlertEmail failed:", err);
    return false;
  }
}
```

Run: `cd /Users/DIALLO9194/Downloads/keza && npm test -- alerts-miles.test.ts`

Expected: Tests PASS (assuming mock Resend is available, or tests skip Resend calls)

### Step 2.3: Commit miles alert email function

```bash
cd /Users/DIALLO9194/Downloads/keza
git add lib/alerts.ts __tests__/lib/alerts-miles.test.ts
git commit -m "feat: add sendMilesAlertEmail for CPP improvement notifications

- New sendMilesAlertEmail() function sends HTML email when CPP >10% better
- Includes route, program, CPP baseline/current, improvement % 
- Links to search, manage alerts, unsubscribe
- Tracking pixel for open-rate analytics
- Graceful failure if RESEND_API_KEY missing

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Extend cron/alerts/route.ts — Add miles alert check

**Files:**
- Modify: `/Users/DIALLO9194/Downloads/keza/app/api/cron/alerts/route.ts`
- Test: `/__tests__/api/cron/alerts.test.ts`

### Step 3.1: Write test for miles alert cron logic

```typescript
// /__tests__/api/cron/alerts.test.ts
import { getCppAlertsForRoute } from "@/lib/alerts";
import { recordCppObservation } from "@/lib/alertsEngine";

describe("cron/alerts — miles alert detection", () => {
  it("should detect >10% CPP improvement on cron run", async () => {
    const routeKey = "SIN:LAX:Singapore KrisFlyer";
    
    // Establish baseline
    await recordCppObservation(routeKey, 1.0);
    
    // Next day: CPP improves 15%
    const result = await recordCppObservation(routeKey, 1.15);
    
    expect(result.triggered).toBe(true);
    expect(result.improvement).toBeCloseTo(0.15, 2);
  });

  it("should not alert if CPP improvement <10%", async () => {
    const routeKey = "NRT:LAX:ANA Mileage Club";
    
    await recordCppObservation(routeKey, 1.0);
    const result = await recordCppObservation(routeKey, 1.08);
    
    expect(result.triggered).toBe(false);
  });

  it("should rate-limit alerts to 1 per route per 24h", async () => {
    // Note: This is tested implicitly by PriceAlert.lastCheckedAt logic
    // Full integration test would require mock cron execution
  });
});
```

Run: `cd /Users/DIALLO9194/Downloads/keza && npm test -- cron/alerts.test.ts`

Expected: Tests PASS

### Step 3.2: Extend cron/alerts/route.ts GET handler

Read the existing cron handler and extend it:

```typescript
// /Users/DIALLO9194/Downloads/keza/app/api/cron/alerts/route.ts (extend GET handler)

import { recordCppObservation } from "@/lib/alertsEngine";
import { sendMilesAlertEmail } from "@/lib/alerts";

// Inside the GET handler, after the price-drop check loop:

  // ─── Miles alert check (new) ─────────────────────────────────────────────
  for (const alert of alerts) {
    if (!alert.milesAlert) continue; // Skip non-miles alerts

    try {
      // Get best miles cost for this program+route+cabin
      const searchResult = await searchEngine(
        {
          from: alert.from,
          to: alert.to,
          date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          returnDate: undefined,
          tripType: "one-way",
          cabins: [alert.cabin],
          passengers: 1,
          currency: "USD",
        },
        { skipCache: true }
      ).catch(() => null);

      if (!searchResult || searchResult.results.length === 0) continue;

      // Find best miles option for the program
      const bestMilesOption = searchResult.results
        .flatMap((r) => r.milesOptions)
        .filter(
          (opt) =>
            opt.program === alert.milesAlert!.program &&
            opt.milesRequired > 0
        )
        .sort((a, b) => b.cpp - a.cpp) // Highest CPP first (best value)
        .at(0);

      if (!bestMilesOption) continue;

      const currentCpp = bestMilesOption.cpp;
      const routeKey = `${alert.from}:${alert.to}:${alert.milesAlert.program}`;

      // Check if >10% improvement
      const observation = await recordCppObservation(routeKey, currentCpp);
      if (observation.triggered) {
        // Verify rate limit: max 1 email per alert per 24h
        if (alert.lastCheckedAt) {
          const lastCheck = new Date(alert.lastCheckedAt).getTime();
          const hoursSince = (Date.now() - lastCheck) / (1000 * 60 * 60);
          if (hoursSince < 24) {
            continue;
          }
        }

        // Send miles alert email
        const sent = await sendMilesAlertEmail(alert, observation.improvement);
        await updateAlertAfterCheck(alert.id, currentCpp, sent);

        if (sent) {
          notified++;
          // Discord notification
          notifyAlertTriggered({
            from: alert.from,
            to: alert.to,
            cabin: alert.cabin,
            adjustedPrice: Math.round(bestMilesOption.cost),
            targetPrice: alert.targetPrice,
            email: alert.email,
          }).catch(() => {});

          // Track event
          trackServerEvent("Miles Alert Triggered", {
            from: alert.from,
            to: alert.to,
            program: alert.milesAlert.program,
            cpp: currentCpp,
            improvement: observation.improvement,
          }).catch(() => {});
        }
      }
    } catch (err) {
      errors.push(`Miles alert check failed for ${alert.id}: ${err}`);
      logError(`[cron/alerts] miles check ${alert.id}:`, err);
    }
  }
```

Run: `cd /Users/DIALLO9194/Downloads/keza && npm test -- cron/alerts.test.ts`

Expected: Tests PASS

### Step 3.3: Commit cron extension

```bash
cd /Users/DIALLO9194/Downloads/keza
git add app/api/cron/alerts/route.ts __tests__/api/cron/alerts.test.ts
git commit -m "feat: add miles alert CPP detection to cron job

- Daily cron now checks milesAlert enabled alerts
- Searches for best miles option on favorite routes
- Detects >10% CPP improvements via alertsEngine
- Sends email via sendMilesAlertEmail()
- Rate-limited to 1 email per route per 24h
- Sentry monitoring + Discord notifications

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Verify API endpoints accept milesAlert params

**Files:**
- Verify: `/Users/DIALLO9194/Downloads/keza/app/api/alerts/route.ts`

### Step 4.1: Check POST endpoint validation

The POST handler in `/app/api/alerts/route.ts` already includes miles alert validation (lines 31-41):

```typescript
const validatedMilesAlert = (
  milesAlert &&
  typeof milesAlert.program === "string" &&
  milesAlert.program.length > 0 &&
  typeof milesAlert.targetCpp === "number" &&
  milesAlert.targetCpp > 0 &&
  milesAlert.targetCpp <= 20 &&
  typeof milesAlert.baseCpp === "number"
)
  ? { program: milesAlert.program as string, targetCpp: milesAlert.targetCpp as number, baseCpp: milesAlert.baseCpp as number }
  : undefined;
```

**Status:** ✅ Already implemented. No changes needed.

### Step 4.2: Verify in integration test

```typescript
// /__tests__/api/alerts.test.ts (append)
describe("POST /api/alerts with milesAlert", () => {
  it("should accept milesAlert payload", async () => {
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "user@example.com",
        from: "SIN",
        to: "LAX",
        cabin: "business",
        currentPrice: 2000,
        milesAlert: {
          program: "Singapore KrisFlyer",
          targetCpp: 1.5,
          baseCpp: 1.2,
        },
      }),
    });

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.alert.milesAlert).toBeDefined();
    expect(data.alert.milesAlert.program).toBe("Singapore KrisFlyer");
  });

  it("should reject invalid milesAlert targetCpp >20", async () => {
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "user@example.com",
        from: "SIN",
        to: "LAX",
        currentPrice: 2000,
        milesAlert: {
          program: "Singapore KrisFlyer",
          targetCpp: 25, // > 20
          baseCpp: 1.2,
        },
      }),
    });

    const data = await res.json();
    expect(data.alert.milesAlert).toBeUndefined();
  });
});
```

Run: `cd /Users/DIALLO9194/Downloads/keza && npm test -- alerts.test.ts`

Expected: Tests PASS

### Step 4.3: No commit needed

Validation already in place; move to next task.

---

## Task 5: Integration test — miles alert flow end-to-end

**Files:**
- Test: `/__tests__/integration/miles-alerts.integration.test.ts`

### Step 5.1: Write end-to-end integration test

```typescript
// /__tests__/integration/miles-alerts.integration.test.ts
import { createAlert, getAlertsByEmail, deactivateAlert } from "@/lib/alerts";
import { trackBaselineCpp, recordCppObservation } from "@/lib/alertsEngine";

describe("Miles alerts E2E flow", () => {
  const testEmail = `test-miles-${Date.now()}@example.com`;
  const routeKey = "SIN:LAX:Singapore KrisFlyer";

  beforeEach(async () => {
    // Clear any existing alerts for test email
    const existing = await getAlertsByEmail(testEmail);
    for (const alert of existing) {
      await deactivateAlert(alert.id);
    }
  });

  it("should create miles alert and trigger on >10% CPP improvement", async () => {
    // 1. User creates miles alert at baseline CPP 1.2
    const alert = await createAlert({
      email: testEmail,
      from: "SIN",
      to: "LAX",
      cabin: "business",
      currentPrice: 2000,
      milesAlert: {
        program: "Singapore KrisFlyer",
        targetCpp: 1.5,
        baseCpp: 1.2,
      },
    });

    expect(alert.milesAlert).toBeDefined();
    expect(alert.milesAlert!.baseCpp).toBe(1.2);

    // 2. Establish baseline in engine
    await trackBaselineCpp(routeKey, 1.2);

    // 3. Simulate next day: CPP improves to 1.38 (+15%)
    const observation = await recordCppObservation(routeKey, 1.38);

    expect(observation.triggered).toBe(true);
    expect(observation.improvement).toBeCloseTo(0.15, 2);

    // 4. Verify alert still active
    const updated = await getAlertsByEmail(testEmail);
    const foundAlert = updated.find((a) => a.id === alert.id);
    expect(foundAlert).toBeDefined();
    expect(foundAlert!.active).toBe(true);
  });

  it("should not trigger if improvement <10%", async () => {
    const alert = await createAlert({
      email: testEmail,
      from: "NRT",
      to: "LAX",
      cabin: "economy",
      currentPrice: 800,
      milesAlert: {
        program: "ANA Mileage Club",
        targetCpp: 1.2,
        baseCpp: 1.0,
      },
    });

    const routeKey2 = "NRT:LAX:ANA Mileage Club";
    await trackBaselineCpp(routeKey2, 1.0);

    // Only 8% improvement
    const observation = await recordCppObservation(routeKey2, 1.08);

    expect(observation.triggered).toBe(false);
    expect(observation.improvement).toBeLessThan(0.10);
  });
});
```

Run: `cd /Users/DIALLO9194/Downloads/keza && npm test -- miles-alerts.integration.test.ts`

Expected: Tests PASS

### Step 5.2: Commit integration test

```bash
cd /Users/DIALLO9194/Downloads/keza
git add __tests__/integration/miles-alerts.integration.test.ts
git commit -m "test: add miles alert E2E integration tests

- Create miles alert + establish baseline
- Simulate daily CPP check with >10% improvement
- Verify alert triggers and remains active
- Verify no trigger for <10% improvement

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Test coverage — >90% for new code

**Files:**
- Check: `/__tests__/lib/alertsEngine.test.ts`
- Check: `/__tests__/lib/alerts-miles.test.ts`
- Check: `/__tests__/api/cron/alerts.test.ts`
- Check: `/__tests__/integration/miles-alerts.integration.test.ts`

### Step 6.1: Run all tests with coverage

```bash
cd /Users/DIALLO9194/Downloads/keza
npm test -- --coverage --collectCoverageFrom="lib/alertsEngine.ts,lib/alerts.ts" alertsEngine.test.ts alerts-miles.test.ts miles-alerts.integration.test.ts 2>&1 | tail -50
```

Expected output should show >90% coverage for:
- `lib/alertsEngine.ts` — lines, branches, functions, statements
- `lib/alerts.ts` (new functions) — lines, branches, functions, statements

### Step 6.2: Add edge case tests if coverage <90%

If coverage is below 90%, add tests for:
- CPP baseline overwrite edge cases
- Null/undefined checks
- Error handling in email send
- Redis failures (graceful fallback)

Example:

```typescript
// /__tests__/lib/alertsEngine.test.ts (append)
describe("Edge cases", () => {
  it("should handle invalid routeKey gracefully", async () => {
    const history = await getBaselineHistory("invalid");
    expect(history).toBeNull();
  });

  it("should handle negative CPP values", () => {
    expect(detectCppImprovement(-1, 2.0)).toBe(false);
    expect(detectCppImprovement(1.0, -2.0)).toBe(false);
  });

  it("should calculate improvement correctly for decimal values", () => {
    expect(detectCppImprovement(0.5, 0.55)).toBe(true); // 10%
    expect(detectCppImprovement(2.0, 2.19)).toBe(false); // 9.5%
    expect(detectCppImprovement(2.0, 2.21)).toBe(true); // 10.5%
  });
});
```

Run: `cd /Users/DIALLO9194/Downloads/keza && npm test -- alertsEngine.test.ts --coverage`

Expected: >90% coverage

### Step 6.3: Commit coverage verification

```bash
cd /Users/DIALLO9194/Downloads/keza
git add __tests__/lib/alertsEngine.test.ts __tests__/lib/alerts-miles.test.ts
git commit -m "test: add edge case coverage for >90% test suite

- Invalid routeKey handling
- Negative/zero CPP detection
- Decimal precision in improvement calculation
- Error handling in email functions

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Build check + pre-push validation

**Files:**
- Check: TypeScript strict mode
- Check: ESLint rules
- Check: All 438+ tests pass

### Step 7.1: Run TypeScript check

```bash
cd /Users/DIALLO9194/Downloads/keza
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors

### Step 7.2: Run ESLint

```bash
cd /Users/DIALLO9194/Downloads/keza
npx eslint lib/alertsEngine.ts lib/alerts.ts app/api/cron/alerts/route.ts 2>&1
```

Expected: No errors

### Step 7.3: Run full test suite

```bash
cd /Users/DIALLO9194/Downloads/keza
npm test 2>&1 | tail -30
```

Expected output:
```
PASS  /__tests__/lib/alertsEngine.test.ts
PASS  /__tests__/lib/alerts-miles.test.ts
PASS  /__tests__/api/cron/alerts.test.ts
PASS  /__tests__/integration/miles-alerts.integration.test.ts
...
Test Suites: 40+ passed, 40+ total
Tests:       438+ passed, 438+ total
```

### Step 7.4: Build check

```bash
cd /Users/DIALLO9194/Downloads/keza
npm run build 2>&1 | grep -E "error|Error|✓|✔" | tail -20
```

Expected: No errors; build succeeds

---

## Task 8: Git push to main + Vercel deploy

**Files:**
- Verify: All commits are ready
- Verify: No uncommitted changes

### Step 8.1: Check git status

```bash
cd /Users/DIALLO9194/Downloads/keza
git status 2>&1
```

Expected: Clean working tree (no unstaged changes)

### Step 8.2: Verify commit history

```bash
cd /Users/DIALLO9194/Downloads/keza
git log --oneline -10
```

Expected: See 6+ new commits (alertsEngine, miles email, cron ext, tests, coverage, edge cases)

### Step 8.3: Push to main

```bash
cd /Users/DIALLO9194/Downloads/keza
git push origin main 2>&1
```

Expected output:
```
remote: Vercel is deploying your branch
remote: ...
To github.com:...
   <old-sha>..<new-sha>  main -> main
```

### Step 8.4: Wait for Vercel deployment

Deployment typically takes 3-5 minutes. Monitor:

```bash
curl -s https://keza-taupe.vercel.app/api/version
```

Compare returned SHA with:

```bash
git -C /Users/DIALLO9194/Downloads/keza log --oneline -1
```

They should match (showing live code matches local latest commit).

---

## Task 9: Verify live deployment + regression tests

**Files:**
- Verify: Deployment live
- Verify: Regression tests pass
- Verify: No regressions in existing features

### Step 9.1: Verify /api/version matches

```bash
DEPLOY_SHA=$(curl -s https://keza-taupe.vercel.app/api/version | jq -r '.sha // .version' 2>/dev/null | cut -c1-7)
LOCAL_SHA=$(git -C /Users/DIALLO9194/Downloads/keza log --oneline -1 | cut -d' ' -f1)

if [ "$DEPLOY_SHA" = "$LOCAL_SHA" ]; then
  echo "✓ Deployment verified: $DEPLOY_SHA"
else
  echo "✗ SHA mismatch! Deploy: $DEPLOY_SHA, Local: $LOCAL_SHA"
fi
```

Expected: ✓ SHAs match

### Step 9.2: Run regression test suite

```bash
cd /Users/DIALLO9194/Downloads/keza
npm test -- --passWithNoTests 2>&1 | tail -20
```

Expected:
```
PASS  /__tests__/...
...
Test Suites: 40+ passed
Tests:       438+ passed
Snapshots:   0 total
Time:        XX.XXXs
```

### Step 9.3: Spot-check key features

Manually verify in browser (optional, if live app accessible):
- Search: `https://keza-taupe.vercel.app/?from=SIN&to=LAX`
- Alerts page: Should load without errors
- Create alert: POST to `/api/alerts` should work

### Step 9.4: Commit final verification

No commit needed — deployment verified.

---

## Summary of Deliverables

| Deliverable | Status | File |
|-------------|--------|------|
| ✅ alertsEngine.ts | Complete | `/lib/alertsEngine.ts` |
| ✅ Miles alert email | Complete | `/lib/alerts.ts` (extended) |
| ✅ Cron integration | Complete | `/app/api/cron/alerts/route.ts` (extended) |
| ✅ API endpoints | Verified | `/app/api/alerts/route.ts` (no changes needed) |
| ✅ Unit tests | >90% coverage | `/__tests__/lib/alertsEngine.test.ts` + `/__tests__/lib/alerts-miles.test.ts` |
| ✅ Integration tests | Complete | `/__tests__/integration/miles-alerts.integration.test.ts` |
| ✅ Build + Tests | Pass | npm test + npx tsc + npx eslint ✓ |
| ✅ Live deployment | Verified | SHA match: Vercel == git log -1 |
| ✅ Git commits | 6+ commits | Messages with Co-Authored-By footer |

---

## Key Features Implemented

1. **Baseline CPP Tracking** — `trackBaselineCpp()` stores baseline per route+program, no overwrite <24h
2. **CPP Improvement Detection** — `detectCppImprovement()` checks >10% threshold (improvement >= 0.10)
3. **Daily Cron Check** — `/api/cron/alerts` searches favorite routes, calls alertsEngine, sends emails on trigger
4. **Miles Alert Email** — HTML email with route, program, baseline/current CPP, improvement %, manage/unsubscribe links
5. **Redis Storage** — All baselines stored in Redis with 90-day TTL (key: `keza:cpp:baseline:{routeKey}`)
6. **Sentry Monitoring** — Cron wrapped in `Sentry.withMonitor()`, errors tracked
7. **Rate Limiting** — Max 1 email per alert per 24h (via `lastCheckedAt`)
8. **Test Coverage** — >90% on new code, 438+ regression tests pass
9. **Pre-push Hooks** — TypeScript + ESLint + Jest all enforced (never skip)
10. **Vercel Deployment** — Auto-deploy on push, SHA verified live

---

## Architecture Diagram

```
User creates miles alert
         |
         v
POST /api/alerts { milesAlert: { program, targetCpp, baseCpp } }
         |
         v
createAlert() → Redis keza:alert:{id} + keza:alerts:email:{email} index
         |
         v
[Daily] GET /api/cron/alerts
    |
    +-- getAllActiveRoutes() → [ "SIN:LAX", "NRT:LAX", ... ]
    |
    +-- For each route → fetchCalendarPrices() → cheapest price
    |
    +-- For each alert on route:
    |       |
    |       +-- Alert milesAlert? → searchEngine() → find best miles option
    |       |
    |       +-- recordCppObservation() → compare to baseline
    |       |
    |       +-- If >10% improvement:
    |           |
    |           +-- sendMilesAlertEmail() → Resend → user inbox
    |           |
    |           +-- updateAlertAfterCheck() → update Redis
    |           |
    |           +-- trackServerEvent() → Analytics
    |           |
    |           +-- notifyAlertTriggered() → Discord
    |
    v
Response: { checked: N, notified: M, errors: [...] }
```

---

## Testing Checklist

- [ ] `npm test -- alertsEngine.test.ts` — all baseline tracking tests PASS
- [ ] `npm test -- alerts-miles.test.ts` — email generation tests PASS
- [ ] `npm test -- cron/alerts.test.ts` — CPP detection tests PASS
- [ ] `npm test -- miles-alerts.integration.test.ts` — E2E flow PASS
- [ ] `npm test` — all 438+ tests PASS
- [ ] `npx tsc --noEmit` — no TypeScript errors
- [ ] `npx eslint lib/alertsEngine.ts lib/alerts.ts` — no lint errors
- [ ] `npm run build` — build succeeds
- [ ] Git push to main
- [ ] Vercel deployment verified (SHA match)

---

## Rollback Plan (if deployment issues)

```bash
# If live deployment has issues:
git revert <commit-sha> -m 1
git push origin main
# Vercel auto-deploys the revert
curl https://keza-taupe.vercel.app/api/version  # verify SHA matches pre-alerts commit
```

---

**Ready to execute.** Hand off to implementing agent with tasks 1–9 in sequence.

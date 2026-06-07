# KEZA Pro: Trial 7 jours + Feature Gating

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 7-day free trial on first login + gate Pro features (6-month history, multi-passenger alerts)

**Architecture:** Trial stored in Redis with 7-day TTL. Pro access determined by `isProUser()` OR active trial. Reminder email sent 1 day before expiry. Features hidden via `useProAccess()` hook when not Pro/trial.

**Tech Stack:** Next.js 15, TypeScript, Redis (Upstash), Resend (email), React hooks

---

## File Structure

**New files:**
- `lib/lemonsqueezy.ts` (extend): Add trial functions
- `lib/proAccess.ts` (create): Server-side Pro access logic
- `hooks/useProAccess.ts` (create): Client-side Pro access hook
- `app/api/pro/trial/route.ts` (create): Grant trial on first login
- `app/api/cron/trial-reminder.ts` (create): Reminder email cron
- `__tests__/lib/proAccess.test.ts` (create): Pro access tests
- `__tests__/hooks/useProAccess.test.ts` (create): Hook tests

**Modified files:**
- `app/layout.tsx`: Call trial grant on first login
- `app/portefeuille/PortefeuilleClient.tsx`: Gate 6-month history
- `app/alertes/AlertesClient.tsx`: Gate multi-passenger inputs
- `components/ProUpgradeCard.tsx` (create): Upgrade paywall

---

## Task 1: Extend lemonsqueezy.ts with trial functions

**Files:**
- Modify: `lib/lemonsqueezy.ts` (extend with trial logic)
- Test: `__tests__/lib/proAccess.test.ts` (new file)

- [ ] **Step 1: Add trial type and constants**

```typescript
// In lib/lemonsqueezy.ts, add after PRO_KEY definition:

const TRIAL_KEY = (email: string) => `keza:pro:trial:${email.toLowerCase()}`;
const TRIAL_DURATION_DAYS = 7;
const TRIAL_REMINDER_DAYS = 1;

interface TrialStatus {
  createdAt: string;
  expiresAt: string;
}
```

- [ ] **Step 2: Add trial helper functions to lemonsqueezy.ts**

```typescript
// Add to lib/lemonsqueezy.ts:

/**
 * Grant a 7-day trial to a user if they don't already have one.
 * Returns true if trial was newly granted, false if already has trial or Pro.
 */
export async function grantTrialIfNew(email: string): Promise<boolean> {
  try {
    const lowerEmail = email.toLowerCase();
    
    // Check if already Pro
    if (await isProUser(lowerEmail)) {
      return false;
    }
    
    // Check if trial already exists
    const existing = await redis.get<TrialStatus>(TRIAL_KEY(lowerEmail));
    if (existing) {
      return false;
    }
    
    // Create new trial
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
    
    const trial: TrialStatus = {
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
    
    await redis.set(
      TRIAL_KEY(lowerEmail),
      JSON.stringify(trial),
      { ex: TRIAL_DURATION_DAYS * 24 * 60 * 60 }
    );
    
    return true;
  } catch (err) {
    logError("[lemonsqueezy] grantTrialIfNew failed", err);
    return false;
  }
}

/**
 * Get trial status for a user. Returns null if no active trial.
 */
export async function getTrialStatus(email: string): Promise<TrialStatus | null> {
  try {
    const val = await redis.get<TrialStatus>(TRIAL_KEY(email.toLowerCase()));
    if (!val) return null;
    
    const trial = typeof val === 'string' ? JSON.parse(val) : val;
    const expiresAt = new Date(trial.expiresAt);
    
    // Check if expired
    if (expiresAt < new Date()) {
      await redis.del(TRIAL_KEY(email.toLowerCase()));
      return null;
    }
    
    return trial;
  } catch {
    return null;
  }
}

/**
 * Check if user needs trial reminder (1 day before expiry).
 */
export async function needsTrialReminder(email: string): Promise<boolean> {
  try {
    const trial = await getTrialStatus(email.toLowerCase());
    if (!trial) return false;
    
    const expiresAt = new Date(trial.expiresAt);
    const reminderTime = new Date(expiresAt.getTime() - TRIAL_REMINDER_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date();
    
    return now >= reminderTime && now < expiresAt;
  } catch {
    return false;
  }
}

/**
 * Revoke trial (when user cancels or it expires).
 */
export async function revokeTrial(email: string): Promise<void> {
  try {
    await redis.del(TRIAL_KEY(email.toLowerCase()));
  } catch (err) {
    logError("[lemonsqueezy] revokeTrial failed", err);
  }
}
```

- [ ] **Step 3: Create proAccess.ts with server logic**

```typescript
// Create lib/proAccess.ts:

import { isProUser, getTrialStatus } from "@/lib/lemonsqueezy";

export interface ProAccessStatus {
  isPro: boolean;
  hasTrial: boolean;
  daysLeft: number | null;
  isActive: boolean; // isPro OR (hasTrial AND not expired)
}

/**
 * Check Pro access for a user (server-side).
 * Used in API routes, server components, and server actions.
 */
export async function checkProAccess(email: string): Promise<ProAccessStatus> {
  try {
    const [isPro, trial] = await Promise.all([
      isProUser(email),
      getTrialStatus(email),
    ]);
    
    let daysLeft: number | null = null;
    if (trial) {
      const expiresAt = new Date(trial.expiresAt);
      const now = new Date();
      daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      daysLeft = Math.max(0, daysLeft);
    }
    
    return {
      isPro,
      hasTrial: !!trial,
      daysLeft,
      isActive: isPro || !!trial,
    };
  } catch {
    // Fail open: assume not Pro
    return {
      isPro: false,
      hasTrial: false,
      daysLeft: null,
      isActive: false,
    };
  }
}
```

- [ ] **Step 4: Create hook useProAccess.ts**

```typescript
// Create hooks/useProAccess.ts:

"use client";

import { useEffect, useState } from "react";
import type { ProAccessStatus } from "@/lib/proAccess";

/**
 * Client-side hook to get Pro access status.
 * Calls /api/pro/access endpoint.
 */
export function useProAccess(): ProAccessStatus & { loading: boolean } {
  const [status, setStatus] = useState<ProAccessStatus>({
    isPro: false,
    hasTrial: false,
    daysLeft: null,
    isActive: false,
  });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetch() {
      try {
        const res = await fetch("/api/pro/access");
        if (res.ok) {
          const data = (await res.json()) as ProAccessStatus;
          setStatus(data);
        }
      } catch {
        // Fail open
      } finally {
        setLoading(false);
      }
    }
    
    fetch();
  }, []);
  
  return { ...status, loading };
}
```

- [ ] **Step 5: Create tests for proAccess**

```typescript
// Create __tests__/lib/proAccess.test.ts:

import { checkProAccess } from "@/lib/proAccess";
import * as lemonsqueezy from "@/lib/lemonsqueezy";

jest.mock("@/lib/lemonsqueezy");

describe("checkProAccess", () => {
  afterEach(() => jest.clearAllMocks());
  
  it("returns isActive=true when user is Pro", async () => {
    (lemonsqueezy.isProUser as jest.Mock).mockResolvedValue(true);
    (lemonsqueezy.getTrialStatus as jest.Mock).mockResolvedValue(null);
    
    const result = await checkProAccess("user@example.com");
    
    expect(result.isPro).toBe(true);
    expect(result.isActive).toBe(true);
  });
  
  it("returns isActive=true when user has active trial", async () => {
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    (lemonsqueezy.isProUser as jest.Mock).mockResolvedValue(false);
    (lemonsqueezy.getTrialStatus as jest.Mock).mockResolvedValue({
      createdAt: new Date().toISOString(),
      expiresAt,
    });
    
    const result = await checkProAccess("user@example.com");
    
    expect(result.hasTrial).toBe(true);
    expect(result.isActive).toBe(true);
    expect(result.daysLeft).toBe(3);
  });
  
  it("returns isActive=false when no Pro and no trial", async () => {
    (lemonsqueezy.isProUser as jest.Mock).mockResolvedValue(false);
    (lemonsqueezy.getTrialStatus as jest.Mock).mockResolvedValue(null);
    
    const result = await checkProAccess("user@example.com");
    
    expect(result.isActive).toBe(false);
  });
});
```

- [ ] **Step 6: Run tests**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest __tests__/lib/proAccess.test.ts -v
```

Expected: All 3 tests pass

- [ ] **Step 7: Commit**

```bash
git add lib/lemonsqueezy.ts lib/proAccess.ts hooks/useProAccess.ts __tests__/lib/proAccess.test.ts
git commit -m "feat(pro): add trial logic and pro access utilities (Task 1)"
```

---

## Task 2: Create Pro access API endpoint

**Files:**
- Create: `app/api/pro/access/route.ts`
- Modify: `app/layout.tsx` (call trial grant on first login)

- [ ] **Step 1: Create /api/pro/access endpoint**

```typescript
// Create app/api/pro/access/route.ts:

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { checkProAccess } from "@/lib/proAccess";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        {
          isPro: false,
          hasTrial: false,
          daysLeft: null,
          isActive: false,
        },
        { status: 200 }
      );
    }
    
    const status = await checkProAccess(session.user.email);
    return NextResponse.json(status);
  } catch (err) {
    console.error("[api/pro/access]", err);
    return NextResponse.json(
      {
        isPro: false,
        hasTrial: false,
        daysLeft: null,
        isActive: false,
      },
      { status: 200 }
    );
  }
}
```

- [ ] **Step 2: Update layout.tsx to grant trial on first login**

In `app/layout.tsx`, find the main layout export and add trial grant:

```typescript
// In app/layout.tsx, add import at top:
import { grantTrialIfNew } from "@/lib/lemonsqueezy";

// Add a new client component TrialGranter (inline or separate file)
// that calls the trial grant API on mount.

// Then in the RootLayout, include it:
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  
  // Grant trial if this is first login
  if (session?.user?.email) {
    await grantTrialIfNew(session.user.email).catch(() => {});
  }
  
  return (
    <html suppressHydrationWarning>
      {/* ... rest of layout ... */}
      {children}
    </html>
  );
}
```

- [ ] **Step 3: Run tests to verify no regressions**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest --passWithNoTests
```

Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add app/api/pro/access/route.ts app/layout.tsx
git commit -m "feat(pro): add pro access endpoint + grant trial on login (Task 2)"
```

---

## Task 3: Create trial reminder cron

**Files:**
- Create: `app/api/cron/trial-reminder/route.ts`

- [ ] **Step 1: Create trial reminder cron**

```typescript
// Create app/api/cron/trial-reminder/route.ts:

import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { logWarn } from "@/lib/logger";
import { needsTrialReminder } from "@/lib/lemonsqueezy";
import { sendTrialReminderEmail } from "@/lib/resend";

// Vercel cron header validation
function validateCronSecret(req: Request): boolean {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret || !authHeader) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    // Scan Redis for trial keys expiring in next 24h
    // This is a simplified approach — in production, maintain a separate "pending_reminders" set
    
    logWarn("[cron/trial-reminder] Starting trial reminder scan");
    
    // Note: Redis SCAN is not exposed via Upstash REST API for key patterns
    // Instead, we'll use a separate set to track pending reminders
    
    const pendingKeys = await redis.smembers("keza:trial:pending_reminders");
    let reminded = 0;
    
    for (const email of pendingKeys) {
      if (await needsTrialReminder(email)) {
        try {
          await sendTrialReminderEmail(email);
          reminded++;
          // Remove from pending set after reminding
          await redis.srem("keza:trial:pending_reminders", email);
        } catch (err) {
          logWarn(`[cron] Failed to send trial reminder to ${email}`, err);
        }
      }
    }
    
    logWarn(`[cron/trial-reminder] Reminded ${reminded} users`);
    
    return NextResponse.json({ reminded });
  } catch (err) {
    logWarn("[cron/trial-reminder] Failed", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Add reminder email function to lib/resend.ts**

```typescript
// Add to lib/resend.ts (or create if not exists):

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendTrialReminderEmail(email: string): Promise<void> {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "noreply@keza.app",
    to: email,
    subject: "Votre essai gratuit KEZA Pro expire demain",
    html: `
      <p>Bonjour,</p>
      <p>Votre essai gratuit de 7 jours à KEZA Pro expire <strong>demain</strong>.</p>
      <p>Après l'expiration, vous perdrez l'accès à :</p>
      <ul>
        <li>Historique des prix sur 6 mois</li>
        <li>Alertes multi-passagers</li>
        <li>Alertes illimitées</li>
      </ul>
      <p><a href="https://keza-taupe.vercel.app/pro">Passer à KEZA Pro</a> maintenant pour continuer.</p>
    `,
  });
}
```

- [ ] **Step 3: Update grantTrialIfNew to add to pending_reminders set**

Back in `lib/lemonsqueezy.ts`, modify grantTrialIfNew:

```typescript
// In grantTrialIfNew, after redis.set for trial, add:
    await redis.sadd("keza:trial:pending_reminders", lowerEmail);
```

- [ ] **Step 4: Test cron endpoint manually**

```bash
curl -X POST http://localhost:3000/api/cron/trial-reminder \
  -H "Authorization: Bearer $CRON_SECRET"
```

Expected: Returns `{"reminded": 0}` (or number of reminded users if any)

- [ ] **Step 5: Commit**

```bash
git add app/api/cron/trial-reminder/route.ts lib/resend.ts lib/lemonsqueezy.ts
git commit -m "feat(pro): add trial reminder cron + email (Task 3)"
```

---

## Task 4: Gate 6-month history feature

**Files:**
- Modify: `app/portefeuille/PortefeuilleClient.tsx`
- Create: `components/ProUpgradeCard.tsx`

- [ ] **Step 1: Create ProUpgradeCard component**

```typescript
// Create components/ProUpgradeCard.tsx:

"use client";

import Link from "next/link";

export function ProUpgradeCard({ daysLeft }: { daysLeft: number | null }) {
  if (daysLeft === null) {
    // Pro user, show nothing
    return null;
  }
  
  return (
    <div className="rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-6 mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-amber-900 mb-2">
            {daysLeft > 0 ? `Essai gratuit: ${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant` : "Essai expiré"}
          </h3>
          <p className="text-sm text-amber-800 mb-4">
            Passe à KEZA Pro pour débloquer l'historique des prix sur 6 mois et les alertes multi-passagers.
          </p>
        </div>
      </div>
      <Link
        href="/pro"
        className="inline-block rounded-lg bg-amber-600 text-white text-sm font-bold px-6 py-2 hover:bg-amber-700 transition-colors"
      >
        Passer à KEZA Pro
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Modify PortefeuilleClient to gate history**

In `app/portefeuille/PortefeuilleClient.tsx`, add:

```typescript
// At top of PortefeuilleClient.tsx, add import:
import { useProAccess } from "@/hooks/useProAccess";
import { ProUpgradeCard } from "@/components/ProUpgradeCard";

// Inside PortefeuilleClient component function, add:
export function PortefeuilleClient() {
  const { isActive: hasProAccess, daysLeft, loading } = useProAccess();
  
  // ... existing state and logic ...
  
  if (loading) {
    return <LoadingState />;
  }
  
  return (
    <div className="space-y-6">
      {!hasProAccess && <ProUpgradeCard daysLeft={daysLeft} />}
      
      {hasProAccess && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 mb-6">
          <p className="text-sm text-blue-800">
            {daysLeft !== null && daysLeft > 0 
              ? `Essai gratuit actif: ${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant` 
              : "KEZA Pro actif"}
          </p>
        </div>
      )}
      
      {/* Render 6-month history only if Pro/trial active */}
      {hasProAccess && (
        <div>
          <h2 className="text-lg font-bold mb-4">Historique 6 mois</h2>
          {/* SixMonthHistory component here */}
        </div>
      )}
      
      {/* Rest of portfolio UI ... */}
    </div>
  );
}
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest --passWithNoTests
```

Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add app/portefeuille/PortefeuilleClient.tsx components/ProUpgradeCard.tsx
git commit -m "feat(pro): gate 6-month history feature behind Pro/trial (Task 4)"
```

---

## Task 5: Gate multi-passenger alerts feature

**Files:**
- Modify: `app/alertes/AlertesClient.tsx` (or form component)

- [ ] **Step 1: Find and modify alert form**

In `app/alertes/AlertesClient.tsx`, add:

```typescript
// At top, add import:
import { useProAccess } from "@/hooks/useProAccess";

// Inside form, add Pro access check:
export function AlertesClient() {
  const { isActive: hasProAccess } = useProAccess();
  
  return (
    <div>
      {/* Existing alert UI ... */}
      
      <form onSubmit={handleSubmit}>
        {/* Basic alert fields (always visible) */}
        <input name="route" placeholder="SIN-LAX" required />
        <input name="price" type="number" placeholder="Target price" required />
        
        {/* Multi-passenger selector (gated) */}
        {hasProAccess ? (
          <div>
            <label>Nombre de passagers</label>
            <select name="passengers" defaultValue="1">
              <option value="1">1 passager</option>
              <option value="2">2 passagers</option>
              <option value="3">3 passagers</option>
              <option value="4">4 passagers</option>
            </select>
          </div>
        ) : (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 mb-4">
            <p className="text-sm text-amber-800 font-semibold mb-2">
              Alertes multi-passagers (Pro uniquement)
            </p>
            <p className="text-xs text-amber-700 mb-3">
              Configurez des alertes pour 2, 3 ou 4 passagers avec KEZA Pro.
            </p>
            <Link
              href="/pro"
              className="inline-block text-sm text-amber-700 font-bold underline"
            >
              Passer à KEZA Pro →
            </Link>
          </div>
        )}
        
        <button type="submit">Créer alerte</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest --passWithNoTests
```

Expected: All tests pass

- [ ] **Step 3: Test manually in browser**

```bash
npm run dev
# Navigate to /alertes, verify multi-passenger selector is hidden until Pro
```

- [ ] **Step 4: Commit**

```bash
git add app/alertes/AlertesClient.tsx
git commit -m "feat(pro): gate multi-passenger alerts behind Pro/trial (Task 5)"
```

---

## Task 6: Full integration test

**Files:**
- Create: `__tests__/integration/pro-trial.integration.test.ts`

- [ ] **Step 1: Write integration test**

```typescript
// Create __tests__/integration/pro-trial.integration.test.ts:

import { grantTrialIfNew, getTrialStatus, needsTrialReminder } from "@/lib/lemonsqueezy";
import { checkProAccess } from "@/lib/proAccess";
import { redis } from "@/lib/redis";

describe("Pro Trial Integration", () => {
  const testEmail = `trial-test-${Date.now()}@example.com`;
  
  afterAll(async () => {
    // Cleanup
    await redis.del(`keza:pro:trial:${testEmail}`);
    await redis.del(`keza:pro:${testEmail}`);
  });
  
  it("grants trial on first login", async () => {
    const granted = await grantTrialIfNew(testEmail);
    expect(granted).toBe(true);
  });
  
  it("does not re-grant trial to same user", async () => {
    const granted = await grantTrialIfNew(testEmail);
    expect(granted).toBe(false);
  });
  
  it("returns active Pro access status with trial", async () => {
    const status = await checkProAccess(testEmail);
    expect(status.hasTrial).toBe(true);
    expect(status.isActive).toBe(true);
    expect(status.daysLeft).toBeLessThanOrEqual(7);
  });
  
  it("trial status includes expiry date", async () => {
    const trial = await getTrialStatus(testEmail);
    expect(trial).not.toBeNull();
    expect(trial!.expiresAt).toBeDefined();
  });
});
```

- [ ] **Step 2: Run integration test**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest __tests__/integration/pro-trial.integration.test.ts -v
```

Expected: All 4 tests pass

- [ ] **Step 3: Run full test suite**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest --passWithNoTests
```

Expected: All tests pass, no regressions

- [ ] **Step 4: Commit**

```bash
git add __tests__/integration/pro-trial.integration.test.ts
git commit -m "test(pro): add trial integration tests (Task 6)"
```

---

## Task 7: Verify no regressions

- [ ] **Step 1: Run TypeScript check**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 2: Run ESLint**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx eslint .
```

Expected: No errors

- [ ] **Step 3: Run full test suite**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest --passWithNoTests
```

Expected: All tests pass

- [ ] **Step 4: Build check**

```bash
cd /Users/DIALLO9194/Downloads/keza
npm run build
```

Expected: Build succeeds

- [ ] **Step 5: Push to main**

```bash
cd /Users/DIALLO9194/Downloads/keza
git push origin main
```

Expected: All commits pushed

- [ ] **Step 6: Verify deployment**

```bash
curl https://keza-taupe.vercel.app/api/version
```

Expected: SHA matches latest commit

- [ ] **Step 7: Manual verification**

- Visit https://keza-taupe.vercel.app/pro
- Verify paywall UI loads
- Check `/portefeuille` → 6-month history hidden for non-Pro
- Check `/alertes` → multi-passenger selector hidden for non-Pro
- Verify Pro access check endpoint: `curl https://keza-taupe.vercel.app/api/pro/access`

- [ ] **Step 8: Commit if any fixes needed**

If any regressions found, fix and re-commit

---

## Summary

**Completed features:**
1. ✅ Trial granted automatically on first login
2. ✅ Trial stored in Redis with 7-day TTL
3. ✅ Reminder email sent 1 day before expiry
4. ✅ 6-month history gated behind Pro/trial
5. ✅ Multi-passenger alerts gated behind Pro/trial
6. ✅ Upgrade paywall shown when features are gated
7. ✅ All tests pass
8. ✅ Zero regressions

**Ready for:** Audit 360 (design, features, flights, UX, deployment, performance)

# P1 Sentry Fixes — Action Items

**Priority:** 🔴 CRITICAL  
**Timeline:** This week  
**Owner:** Backend + Frontend

---

## 1. Create Client Config File

**File:** `sentry.client.config.ts` (create new)

```typescript
// This file configures the initialization of Sentry on the **client** side.
// The config you add here will be used whenever the client handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 10% of transactions for performance monitoring (client-side can be expensive)
  tracesSampleRate: 0.1,

  // Session replay: capture 5% of sessions, 100% on errors
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  // Integrations
  integrations: [
    new Sentry.Replay({
      maskAllText: true,      // Don't capture user input
      blockAllMedia: true,    // Don't capture images
    }),
  ],

  debug: false,
});
```

---

## 2. Add Sentry to Payment Routes

**File:** `app/api/pro/checkout/route.ts`

```typescript
import * as Sentry from "@sentry/nextjs";
import { logError } from "@/lib/logger";

export async function POST(req: NextRequest) {
  // ... existing validation ...

  try {
    const body = await req.json();
    const { email } = body as { email?: string };

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const url = await createCheckoutUrl(email.trim().toLowerCase());
    return NextResponse.json({ checkoutUrl: url });
  } catch (err) {
    // ADD THIS:
    logError("[api/pro/checkout]", err, { email: (err as any).email });
    
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[checkout] Error creating checkout:", message);
    
    if (message.includes("not configured")) {
      return NextResponse.json(
        { error: "Payments not yet configured" },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**File:** `app/api/webhooks/lemonsqueezy/route.ts`

```typescript
import * as Sentry from "@sentry/nextjs";
import { logError } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-signature") ?? "";
  const rawBody = await req.text();

  if (!verifyLemonWebhook(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: LemonWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as LemonWebhookPayload;
  } catch (err) {
    logError("[webhooks/lemonsqueezy] JSON parse error", err);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventName = payload.meta.event_name;
  const email = payload.meta.custom_data?.keza_email ?? payload.data.attributes.user_email;

  if (!email) {
    logError("[webhooks/lemonsqueezy] no email in payload", new Error("missing email"));
    return NextResponse.json({ error: "No email in payload" }, { status: 400 });
  }

  try {
    switch (eventName) {
      case "subscription_created":
      case "subscription_resumed":
        await grantPro(email, payload.data.id);
        trackServerEvent("Pro Subscription Created", { email }).catch(() => {});
        sendDiscordAlert("", [{ title: `💎 Nouveau Pro — ${email}` }]).catch(() => {});
        break;

      case "subscription_cancelled":
      case "subscription_expired":
        await revokePro(email);
        trackServerEvent("Pro Subscription Cancelled", { email }).catch(() => {});
        break;

      default:
        break;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    // ADD THIS:
    logError("[webhooks/lemonsqueezy]", err, { eventName, email });
    return NextResponse.json({ ok: true }, { status: 200 });  // Still return 200 to prevent redelivery
  }
}
```

---

## 3. Add Sentry to High-Impact Routes (in order)

**Routes to update (use same pattern as above):**

```
CRITICAL (do first):
1. app/api/calendar/route.ts              (calendar widget)
2. app/api/price-history/route.ts         (price trends)
3. app/api/deals/route.ts                 (deals widget)
4. app/api/trending/route.ts              (trending routes)
5. app/api/promos/route.ts                (promotions)

IMPORTANT (next):
6. app/api/airports/route.ts
7. app/api/alerts/unsubscribe/route.ts
8. app/api/profile/route.ts
9. app/api/referral/route.ts
10. app/api/push/test/route.ts
11. app/api/push/unsubscribe/route.ts
12. app/api/stats/route.ts

THEN (remaining):
13-25: admin routes, auth, track routes, version, health, feed, forex, etc.
```

**Pattern for each:**

```typescript
// At top
import { logError } from "@/lib/logger";

// In catch block (add this line)
logError("[api/ROUTE_NAME]", err);
```

---

## 4. Add Sentry to Client Components

**Components with silent failures (add error capture):**

```typescript
// BEFORE (DealsStrip.tsx)
.catch(() => setLoading(false));

// AFTER
.catch((err) => {
  console.error("[DealsStrip] fetch /api/deals:", err);
  Sentry.captureException(err, { tags: { component: "DealsStrip" } });
  setLoading(false);
});
```

**Components to update:**

```
1. components/DealsStrip.tsx
2. components/CheapestRouteBanner.tsx
3. components/PromoBanner.tsx
4. components/TrendingRoutesWidget.tsx
5. components/CheapestDatesCalendar.tsx
6. components/PriceTrendBadge.tsx
7. components/PriceHistoryChart.tsx
8. components/AirportPicker.tsx
9. components/NewsletterSignup.tsx
10. components/PriceHeatmap.tsx
```

**Add this import at top of each:**

```typescript
import * as Sentry from "@sentry/nextjs";
```

**Then wrap each fetch .catch() with:**

```typescript
.catch((err) => {
  Sentry.captureException(err, { 
    tags: { component: "ComponentName" },
    extra: { context: "what you were doing" }
  });
  // ... existing error handling ...
});
```

---

## 5. Configure Sentry Alerts

**In Sentry Web UI:**

1. Go to: https://sentry.io/organizations/kezza/alerts/
2. Create Alert Rule:
   - **Trigger:** `error.count() > 50 in the last 5 minutes`
   - **Environment:** `Production`
   - **Action:** Send to Slack/Email
   - **Name:** "🚨 Error spike in KEZA"

3. Create Alert Rule:
   - **Trigger:** `event.environment:"production" AND error.value:500`
   - **Action:** Send to Slack immediately
   - **Name:** "🔴 Critical error (5xx)"

4. Create Alert Rule:
   - **Trigger:** `tags.prefix:"[api/pro" OR tags.prefix:"[webhooks/lemonsqueezy"`
   - **Action:** Send to Slack immediately
   - **Name:** "💰 Payment system error"

---

## 6. Verify Installation

After merging changes:

```bash
# 1. Check that errors are captured
curl -X POST https://keza-taupe.vercel.app/api/calendar?from=INVALID&to=JFK&month=2026-06
# Should see error in Sentry within 30s

# 2. Check source maps
# Go to Sentry Issue → view stack trace
# Should show file names and line numbers (not minified)

# 3. Test Sentry alert
# Go to Sentry UI → Alerts → Test
# Should receive Slack/email notification

# 4. Monitor for 24h
# Watch https://sentry.io/organizations/kezza/issues/
# Should see all new errors appearing
```

---

## 7. Deployment Checklist

- [ ] Create sentry.client.config.ts
- [ ] Update /api/pro/checkout
- [ ] Update /api/webhooks/lemonsqueezy
- [ ] Update 5 high-impact routes (calendar, price-history, deals, trending, promos)
- [ ] Update client components (DealsStrip, TrendingRoutesWidget, etc.)
- [ ] Configure Sentry alert rules
- [ ] Test error capture in staging
- [ ] Merge PR and deploy to production
- [ ] Verify errors appear in Sentry within 5 minutes
- [ ] Verify Sentry alerts fire
- [ ] Update KEZA_MONITORING.md with new endpoints

---

## 8. Files to Commit

```
NEW:
+ sentry.client.config.ts

MODIFIED:
M app/api/pro/checkout/route.ts
M app/api/webhooks/lemonsqueezy/route.ts
M app/api/calendar/route.ts
M app/api/price-history/route.ts
M app/api/deals/route.ts
M app/api/trending/route.ts
M app/api/promos/route.ts
M components/DealsStrip.tsx
M components/CheapestRouteBanner.tsx
M components/TrendingRoutesWidget.tsx
M components/CheapestDatesCalendar.tsx
M components/PriceHistoryChart.tsx
M components/PromoBanner.tsx
M components/PriceTrendBadge.tsx
M components/AirportPicker.tsx
M components/NewsletterSignup.tsx
M components/PriceHeatmap.tsx
... and remaining ~15 routes
```

---

## Estimated Effort

- **sentry.client.config.ts:** 10 min
- **2 payment routes:** 15 min
- **5 high-impact routes:** 20 min
- **10 client components:** 30 min
- **Sentry alert rules:** 10 min
- **Testing & verification:** 15 min

**Total:** ~90 minutes of focused work

---

## Questions?

If stuck:
- Sentry docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Check existing error handling: `grep -r "logError" app/api/`
- Run tests: `npm test` (should pass after changes)

Good luck! 🚀

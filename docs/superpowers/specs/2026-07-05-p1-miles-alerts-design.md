# KEZA P1: Miles Alert MVP

**Goal:** Notify users when a route becomes a great miles deal (based on CPP threshold).

**Scope:** Store alert subscriptions → daily cron search → email notification when threshold met.

**Tech Stack:** TypeScript, Next.js, Redis (Upstash), Inngest cron, Resend email.

---

## Routes to Monitor

Start with these 6 corridors (from P3):
- CDG↔BKK, CDG↔JNB, AUH↔LHR, DOH↔JFK, ICN↔LAX, CMN↔JFK

Plus existing major hubs (SIN-LAX, NRT-LAX, DXB-LHR, etc.).

---

## Data Model

**Redis key:** `keza:miles-alert:{email}:{route}:{program}`

```typescript
interface MilesAlert {
  email: string;
  route: string;           // "SIN-LAX"
  program: string;         // "Singapore KrisFlyer"
  thresholdCpp: number;    // e.g., 0.8 (cents per point)
  createdAt: number;       // timestamp
  lastFiredAt?: number;    // prevent spam (fire max 1x/24h per alert)
}
```

---

## Implementation

### 1. **Alert CRUD API** (`app/api/miles-alerts/route.ts`)

```typescript
// POST /api/miles-alerts
// Body: { email, route, program, thresholdCpp }
// Creates/updates alert in Redis

// GET /api/miles-alerts?email={email}
// Returns all alerts for user (no auth — email-only)

// DELETE /api/miles-alerts/{alertId}
// Body: { email, token } (email + simple token for verification)
// Deactivates alert
```

---

### 2. **Inngest Cron Job** (`lib/inngest.ts`)

```typescript
export const checkMilesAlerts = inngest.createFunction(
  { id: "check-miles-alerts" },
  { cron: "0 8 * * *" },  // 8am daily
  async (ctx) => {
    // 1. Fetch all alerts from Redis
    // 2. Group by route
    // 3. For each route, run searchEngine()
    // 4. Check if best CPP > threshold
    // 5. If yes AND lastFiredAt < 24h ago: send email
    // 6. Update lastFiredAt in Redis
  }
)
```

---

### 3. **Email Template** (Resend)

Subject: `"Great deal! {route} via {program} — {cpp}cpp"`

Body:
```
Hi {email},

We found a great miles deal matching your alert:

Route: SIN → LAX
Program: Singapore KrisFlyer
CPP: 1.2¢ (your threshold: 0.8¢)
Award cost: 60,000 miles + $150

Search now: https://keza.app/flights?from=SIN&to=LAX
Manage alerts: https://keza.app/miles-alerts

(Unsubscribe: https://keza.app/miles-alerts?unsubscribe={token})
```

---

### 4. **UI: Set Alert Modal** (FlightCard)

Add button: "Set miles alert for this route"

Modal form:
- Email input
- Program dropdown (from milesOptions on this flight)
- Threshold slider (0.5¢ → 2.0¢, default 1.0¢)
- Submit → POST /api/miles-alerts

---

### 5. **UI: Manage Alerts Page** (`app/miles-alerts/page.tsx`)

Display:
- All alerts for entered email (no login required)
- Route, program, threshold, created date
- Delete button (requires email confirmation token)

---

## Testing

- Unit: CRUD operations, email format validation
- Integration: Cron job finds deals, sends emails
- E2E: Set alert → verify email received

---

## Success Criteria

- ✅ Alert subscriptions persist in Redis
- ✅ Cron runs daily, identifies deals matching thresholds
- ✅ Email sent when threshold met (max 1x/24h per alert)
- ✅ UI: FlightCard "Set alert" button works
- ✅ UI: Manage alerts page shows + deletes alerts
- ✅ Tests passing (unit + integration + E2E)
- ✅ Deployed to production

---

## Deployment Notes

- Add `RESEND_API_KEY` to Vercel env
- Add `INNGEST_API_KEY` if using cloud (optional for local dev)
- Update `vercel.json` cron if using Vercel cron instead of Inngest
- Bump `CACHE_VERSION` if FlightResult shape changes


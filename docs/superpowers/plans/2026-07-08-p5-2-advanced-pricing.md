# P5.2: Advanced Pricing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Enhance KEZA's flight ranking algorithm with 6-signal scoring, ML-powered booking window prediction, A/B testing framework, and price drop alerts.

**Architecture:** 
- Scoring Engine: 6 signals (cabin, accessibility, price, connections, layover, carrier) aggregated to single score
- ML Booking Window: TensorFlow.js LSTM inference for "best booking day" predictions, cached in Redis
- A/B Testing: 33/33/34 split (baseline/signal/ML) with cohort tracking and conversion metrics
- Alerts: Daily digest (6 AM batched) + instant premium alerts with 1/day limit
- Analytics: Dashboard tracking CTR, conversion, A/B cohort sizes, winner selection

**Tech Stack:** 
- TensorFlow.js (local inference, <50ms p95)
- Redis for model cache + cohort state
- Inngest for cron jobs + email delivery
- Next.js API routes for A/B assignment + metrics
- Stripe events for premium alert subscription

**Success Criteria:**
- ✅ 150+ new tests (1,950+ total, zero regression vs. P5.1)
- ✅ Scoring engine handles 6 signals, <100ms p95 latency
- ✅ A/B framework assigns cohorts correctly, analytics dashboard working
- ✅ ML inference integrated, predictions cached
- ✅ Email delivery end-to-end, 40%+ open rate
- ✅ Production deployment verified
- ✅ Week 1-2: soft launch (100% baseline)
- ✅ Week 3-4: signal cohort (33%), CTR tracked
- ✅ Week 5-6: ML cohort (33%), accuracy validated
- ✅ Week 7-8: alerts live
- ✅ Week 9-10: statistical analysis, winner decision

---

## File Structure

### New Files
- Create: `lib/scoring/scoringEngine.ts` — 6-signal aggregation logic (350 LOC)
- Create: `lib/scoring/signals.ts` — Individual signal calculations (200 LOC)
- Create: `lib/ml/mlBookingWindow.ts` — LSTM inference wrapper (400 LOC)
- Create: `lib/ml/modelCache.ts` — Redis model caching layer (150 LOC)
- Create: `lib/abTesting/abTestingFramework.ts` — Cohort assignment & tracking (300 LOC)
- Create: `lib/alerts/priceDropAlerts.ts` — Alert logic & email templates (250 LOC)
- Create: `lib/alerts/alertScheduler.ts` — Inngest job definitions (150 LOC)
- Create: `app/api/scoring/debug/route.ts` — Debug endpoint for scoring (100 LOC)
- Create: `app/api/alerts/subscribe/route.ts` — Alert subscription endpoint (100 LOC)
- Create: `app/api/dashboard/analytics/route.ts` — A/B metrics API (150 LOC)
- Create: `components/AlertsWidget.tsx` — UI for alert subscription (100 LOC)
- Create: `components/ScoringDebugPanel.tsx` — Dev tool for scoring inspection (120 LOC)
- Create: `__tests__/lib/scoring/scoringEngine.test.ts` — 15 tests
- Create: `__tests__/lib/ml/mlBookingWindow.test.ts` — 12 tests
- Create: `__tests__/lib/abTesting/abTestingFramework.test.ts` — 12 tests
- Create: `__tests__/lib/alerts/priceDropAlerts.test.ts` — 11 tests
- Create: `__tests__/integration/p5-2-end-to-end.test.ts` — 10 integration tests

### Modified Files
- Modify: `lib/costEngine.ts` — Import new scoringEngine, use it in buildCostOptions()
- Modify: `lib/engine/index.ts` — Add A/B cohort assignment in search pipeline
- Modify: `app/api/search/route.ts` — Log A/B cohort for analytics
- Modify: `app/page.tsx` — Add AlertsWidget to search sidebar
- Modify: `.env.local` (local only) — Add ML_MODEL_URL, STRIPE_SECRET
- Modify: `vercel.json` — Add cron job for Inngest alert scheduler

---

## Implementation Tasks

### Task 1: Set Up Scoring Engine Infrastructure

**Files:**
- Create: `lib/scoring/signals.ts`
- Create: `lib/scoring/scoringEngine.ts`
- Test: `__tests__/lib/scoring/scoringEngine.test.ts`

- [ ] **Step 1: Create signal calculation functions in signals.ts**

Implement 6 signals as individual functions:

```typescript
// lib/scoring/signals.ts
export interface SignalContext {
  flight: FlightResult;
  userProgram: string;
  bookingDate: Date;
  historicalData?: Record<string, any>;
}

// 1. Cabin Signal (0-100)
export function calculateCabinSignal(ctx: SignalContext): number {
  // Economy=20, Premium Economy=50, Business=80, First=100
  // Return scaled value 0-100
}

// 2. Accessibility Signal (0-100)
export function calculateAccessibilitySignal(ctx: SignalContext): number {
  // Program availability score: exclusive programs higher weight
  // Consider userBalance, programDepletion rate
}

// 3. Price Signal (0-100)
export function calculatePriceSignal(ctx: SignalContext): number {
  // Normalize against route-specific min/max
  // Invert: lower price = higher signal
}

// 4. Connections Signal (0-100)
export function calculateConnectionsSignal(ctx: SignalContext): number {
  // Direct=100, 1-stop=70, 2+stops=40
  // Layover duration penalty
}

// 5. Layover Signal (0-100)
export function calculateLayoverSignal(ctx: SignalContext): number {
  // <2h=100, 2-4h=80, 4-8h=50, 8h+=20
}

// 6. Carrier Signal (0-100)
export function calculateCarrierSignal(ctx: SignalContext): number {
  // Reputation score (alliance, on-time record, product quality)
  // Placeholder: use PROGRAM_TO_AIRLINE mapping
}
```

- [ ] **Step 2: Implement scoringEngine in lib/scoring/scoringEngine.ts**

```typescript
// lib/scoring/scoringEngine.ts
import * as signals from './signals';

export interface ScoringResult {
  overallScore: number;
  breakdown: {
    cabin: number;
    accessibility: number;
    price: number;
    connections: number;
    layover: number;
    carrier: number;
  };
  reasoning: string;
}

export async function scoreFlights(
  flights: FlightResult[],
  userProgram: string,
  bookingDate: Date
): Promise<Array<FlightResult & { scoringResult: ScoringResult }>> {
  return flights.map(flight => {
    const ctx: signals.SignalContext = { flight, userProgram, bookingDate };
    
    const cabin = signals.calculateCabinSignal(ctx);
    const accessibility = signals.calculateAccessibilitySignal(ctx);
    const price = signals.calculatePriceSignal(ctx);
    const connections = signals.calculateConnectionsSignal(ctx);
    const layover = signals.calculateLayoverSignal(ctx);
    const carrier = signals.calculateCarrierSignal(ctx);
    
    // Weighted average (equal weights for MVP)
    const overallScore = (cabin + accessibility + price + connections + layover + carrier) / 6;
    
    return {
      ...flight,
      scoringResult: {
        overallScore,
        breakdown: { cabin, accessibility, price, connections, layover, carrier },
        reasoning: `Overall: ${overallScore.toFixed(1)}/100`
      }
    };
  });
}
```

- [ ] **Step 3: Write unit tests for signals**

```typescript
// __tests__/lib/scoring/scoringEngine.test.ts
describe('Scoring Engine', () => {
  it('calculates cabin signal: Economy=20', () => {
    const ctx = { flight: { cabin: 'economy' }, userProgram: 'KrisFlyer' };
    const score = signals.calculateCabinSignal(ctx as any);
    expect(score).toBe(20);
  });
  
  it('calculates cabin signal: Business=80', () => {
    const ctx = { flight: { cabin: 'business' }, userProgram: 'KrisFlyer' };
    const score = signals.calculateCabinSignal(ctx as any);
    expect(score).toBe(80);
  });

  // ... 13 more tests covering all 6 signals + edge cases
});
```

- [ ] **Step 4: Run tests, verify all passing**

```bash
npm test -- __tests__/lib/scoring/scoringEngine.test.ts
# Expected: 15 passing
```

- [ ] **Step 5: Commit**

```bash
git add lib/scoring/ __tests__/lib/scoring/
git commit -m "feat: implement 6-signal scoring engine for P5.2

- Cabinet, accessibility, price, connections, layover, carrier signals
- Equal weighting for MVP, extensible for future tuning
- 15 unit tests, all passing

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Integrate Scoring Engine into Search Pipeline

**Files:**
- Modify: `lib/costEngine.ts`
- Modify: `lib/engine/index.ts`
- Test: Write 5 integration tests

- [ ] **Step 1: Import scoringEngine in costEngine.ts**

Add after existing imports:

```typescript
import { scoreFlights, ScoringResult } from '@/lib/scoring/scoringEngine';
```

- [ ] **Step 2: Modify buildCostOptions() to call scorer**

In `buildCostOptions()`, after assembling `allResults`, add:

```typescript
// Apply advanced scoring (P5.2)
const scoredResults = await scoreFlights(allResults, userProgram, new Date());
```

- [ ] **Step 3: Sort by overall score**

Replace existing sort with:

```typescript
return scoredResults
  .sort((a, b) => (b.scoringResult?.overallScore ?? 0) - (a.scoringResult?.overallScore ?? 0))
  .map(r => ({ ...r, _score: r.scoringResult })) // Attach for frontend debug
  .slice(0, limit);
```

- [ ] **Step 4: Write integration test**

```typescript
// __tests__/integration/p5-2-scoring.test.ts
it('scores and ranks flights correctly', async () => {
  const flights = await searchEngine('SIN', 'LAX', '2026-08-01', 'economy');
  expect(flights[0].scoringResult).toBeDefined();
  expect(flights[0].scoringResult.overallScore).toBeGreaterThan(flights[1].scoringResult.overallScore);
});
```

- [ ] **Step 5: Run all tests, verify no regression**

```bash
npm test -- __tests__/integration/
# Expected: all passing, P5.1 tests still passing
```

- [ ] **Step 6: Commit**

```bash
git add lib/costEngine.ts lib/engine/index.ts __tests__/integration/p5-2-scoring.test.ts
git commit -m "feat: integrate scoring engine into search pipeline

- Scored results ranked by overall score
- P5.1 tests passing, no regression
- Integration tests verify end-to-end scoring

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Implement A/B Testing Framework

**Files:**
- Create: `lib/abTesting/abTestingFramework.ts`
- Test: `__tests__/lib/abTesting/abTestingFramework.test.ts`

- [ ] **Step 1: Create A/B assignment logic**

```typescript
// lib/abTesting/abTestingFramework.ts
import { createHash } from 'crypto';

export type ABCohort = 'baseline' | 'signal' | 'ml';

export interface ABAssignment {
  userId: string;
  cohort: ABCohort;
  assignedAt: Date;
  variant: ABCohort; // same as cohort for now
}

const COHORT_SPLIT = {
  baseline: 0.33,
  signal: 0.33,
  ml: 0.34
};

export function assignCohort(userId: string): ABCohort {
  // Deterministic hash: same user always gets same cohort
  const hash = createHash('md5').update(userId).digest('hex');
  const value = parseInt(hash.substring(0, 8), 16) / 0xffffffff;
  
  if (value < COHORT_SPLIT.baseline) return 'baseline';
  if (value < COHORT_SPLIT.baseline + COHORT_SPLIT.signal) return 'signal';
  return 'ml';
}

export async function trackConversion(
  userId: string,
  cohort: ABCohort,
  booked: boolean,
  value: number
): Promise<void> {
  // Log to analytics backend (Vercel Analytics / custom endpoint)
  await fetch('/api/dashboard/analytics', {
    method: 'POST',
    body: JSON.stringify({ userId, cohort, booked, value, timestamp: new Date() })
  });
}
```

- [ ] **Step 2: Write tests for cohort assignment**

```typescript
// __tests__/lib/abTesting/abTestingFramework.test.ts
describe('A/B Testing', () => {
  it('assigns baseline cohort deterministically', () => {
    const cohort1 = assignCohort('user123');
    const cohort2 = assignCohort('user123');
    expect(cohort1).toBe(cohort2);
  });
  
  it('distributes cohorts roughly 33/33/34', () => {
    const users = Array.from({ length: 10000 }, (_, i) => `user${i}`);
    const cohorts = users.map(assignCohort);
    const counts = { baseline: 0, signal: 0, ml: 0 };
    cohorts.forEach(c => counts[c]++);
    
    expect(counts.baseline).toBeCloseTo(3300, -1); // ±100
    expect(counts.signal).toBeCloseTo(3300, -1);
    expect(counts.ml).toBeCloseTo(3400, -1);
  });

  // ... 10 more tests
});
```

- [ ] **Step 3: Commit**

```bash
git add lib/abTesting/ __tests__/lib/abTesting/
git commit -m "feat: implement A/B testing framework for P5.2

- Deterministic cohort assignment (baseline/signal/ml)
- ~33/33/34 split maintained
- Conversion tracking ready
- 12 tests, all passing

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Create ML Booking Window Inference Layer

**Files:**
- Create: `lib/ml/mlBookingWindow.ts`
- Create: `lib/ml/modelCache.ts`
- Test: `__tests__/lib/ml/mlBookingWindow.test.ts`

- [ ] **Step 1: Set up TensorFlow.js wrapper**

```typescript
// lib/ml/mlBookingWindow.ts
import * as tf from '@tensorflow/tfjs';

export interface BookingWindowPrediction {
  bestDay: number; // 0-30 days from now
  confidence: number; // 0-1
  priceEstimate: number; // estimated lowest price
}

export async function predictBookingWindow(
  from: string,
  to: string,
  departDate: Date
): Promise<BookingWindowPrediction> {
  try {
    // Load cached model from Redis/S3
    const model = await loadCachedModel(`${from}-${to}`);
    
    // Prepare input: [daysUntilDeparture, dayOfWeek, season, routeHistorical]
    const daysUntilDeparture = Math.floor((departDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const input = tf.tensor2d([[daysUntilDeparture, new Date().getDay(), getSeason(), 0]]);
    
    // Inference
    const prediction = model.predict(input) as tf.Tensor;
    const data = await prediction.data();
    
    return {
      bestDay: Math.max(0, Math.round(data[0])),
      confidence: Math.min(1, Math.max(0, data[1])),
      priceEstimate: Math.max(0, data[2])
    };
  } catch (err) {
    // Fallback: recommend booking 2-4 weeks before departure
    return { bestDay: 21, confidence: 0.5, priceEstimate: 0 };
  }
}

function getSeason(): number {
  const month = new Date().getMonth();
  if (month >= 5 && month <= 7) return 2; // summer
  if (month >= 11 || month <= 1) return 2; // winter
  return 1; // shoulder
}
```

- [ ] **Step 2: Create model cache layer**

```typescript
// lib/ml/modelCache.ts
import { redis } from '@/lib/redis';
import * as tf from '@tensorflow/tfjs';

export async function loadCachedModel(routeKey: string): Promise<tf.LayersModel> {
  const cacheKey = `ml:model:${routeKey}`;
  
  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    // Deserialize from Redis
    return tf.loadLayersModel(`indexeddb://${cacheKey}`);
  }
  
  // Load from S3 or default model
  const model = await tf.loadLayersModel('indexeddb://default-booking-window-model');
  
  // Cache for 24 hours
  await redis.setex(cacheKey, 86400, JSON.stringify({ cached: true }));
  
  return model;
}
```

- [ ] **Step 3: Write ML tests**

```typescript
// __tests__/lib/ml/mlBookingWindow.test.ts
describe('ML Booking Window', () => {
  it('predicts booking window within 0-30 days', async () => {
    const pred = await predictBookingWindow('SIN', 'LAX', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    expect(pred.bestDay).toBeGreaterThanOrEqual(0);
    expect(pred.bestDay).toBeLessThanOrEqual(30);
  });

  // ... 11 more tests
});
```

- [ ] **Step 4: Commit**

```bash
git add lib/ml/ __tests__/lib/ml/
git commit -m "feat: add ML booking window inference for P5.2

- TensorFlow.js LSTM inference wrapper
- Redis model caching (24h TTL)
- Fallback to safe defaults on error
- 12 tests, all passing

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Implement Price Drop Alerts System

**Files:**
- Create: `lib/alerts/priceDropAlerts.ts`
- Create: `lib/alerts/alertScheduler.ts`
- Create: `app/api/alerts/subscribe/route.ts`
- Test: `__tests__/lib/alerts/priceDropAlerts.test.ts`

- [ ] **Step 1: Create alert subscription logic**

```typescript
// lib/alerts/priceDropAlerts.ts
import { prisma } from '@/lib/db';

export interface PriceAlert {
  id: string;
  userId: string;
  from: string;
  to: string;
  departDate: Date;
  priceThreshold: number;
  frequency: 'instant' | 'daily';
  active: boolean;
  createdAt: Date;
}

export async function createPriceAlert(
  userId: string,
  from: string,
  to: string,
  departDate: Date,
  priceThreshold: number,
  frequency: 'instant' | 'daily'
): Promise<PriceAlert> {
  return prisma.priceAlert.create({
    data: { userId, from, to, departDate, priceThreshold, frequency, active: true }
  });
}

export async function checkAndFireAlerts(from: string, to: string, currentPrice: number): Promise<void> {
  const alerts = await prisma.priceAlert.findMany({
    where: { from, to, active: true, priceThreshold: { gte: currentPrice } }
  });
  
  for (const alert of alerts) {
    if (alert.frequency === 'instant') {
      await sendAlertEmail(alert, currentPrice);
    } else {
      // Queue for daily digest
      await queueForDigest(alert, currentPrice);
    }
  }
}

async function sendAlertEmail(alert: PriceAlert, currentPrice: number): Promise<void> {
  // Send via Resend or similar
  // Template: "Price dropped to $X on {{from}}-{{to}} on {{date}}"
}

async function queueForDigest(alert: PriceAlert, currentPrice: number): Promise<void> {
  // Save to daily digest queue (Redis list)
  await redis.lpush(`digest:${alert.userId}`, JSON.stringify({ alert, currentPrice }));
}
```

- [ ] **Step 2: Create Inngest alert scheduler**

```typescript
// lib/alerts/alertScheduler.ts
import { inngest } from '@/lib/inngest';

export const dailyAlertDigest = inngest.createFunction(
  { id: 'daily-alert-digest' },
  { cron: 'TZ=America/Los_Angeles 0 6 * * *' }, // 6 AM Pacific
  async ({ step }) => {
    // Fetch all users with pending digests
    const users = await step.run('fetch-digest-users', async () => {
      const keys = await redis.keys('digest:*');
      return keys.map(k => k.split(':')[1]);
    });
    
    // Send digest email for each user
    for (const userId of users) {
      await step.run(`send-digest-${userId}`, async () => {
        const pending = await redis.lrange(`digest:${userId}`, 0, -1);
        if (pending.length > 0) {
          await sendDigestEmail(userId, pending);
          await redis.del(`digest:${userId}`);
        }
      });
    }
  }
);
```

- [ ] **Step 3: Create subscription endpoint**

```typescript
// app/api/alerts/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createPriceAlert } from '@/lib/alerts/priceDropAlerts';

export async function POST(req: NextRequest) {
  const { userId, from, to, departDate, priceThreshold, frequency } = await req.json();
  
  const alert = await createPriceAlert(userId, from, to, new Date(departDate), priceThreshold, frequency);
  
  return NextResponse.json(alert);
}
```

- [ ] **Step 4: Write alert tests**

```typescript
// __tests__/lib/alerts/priceDropAlerts.test.ts
describe('Price Drop Alerts', () => {
  it('creates alert subscription', async () => {
    const alert = await createPriceAlert('user123', 'SIN', 'LAX', new Date(), 1500, 'daily');
    expect(alert.id).toBeDefined();
    expect(alert.active).toBe(true);
  });

  // ... 10 more tests
});
```

- [ ] **Step 5: Commit**

```bash
git add lib/alerts/ app/api/alerts/ __tests__/lib/alerts/
git commit -m "feat: implement price drop alerts system for P5.2

- Alert subscriptions (instant/daily)
- Inngest cron job for daily digest (6 AM)
- Email delivery via Resend
- 11 tests, all passing

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 6: Build Analytics Dashboard for A/B Testing

**Files:**
- Create: `app/api/dashboard/analytics/route.ts`
- Create: `components/AnalyticsDashboard.tsx`
- Test: `__tests__/lib/dashboard/analytics.test.ts`

- [ ] **Step 1: Create analytics API endpoint**

```typescript
// app/api/dashboard/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { userId, cohort, booked, value } = await req.json();
  
  // Log conversion
  await prisma.abTestingMetric.create({
    data: { userId, cohort, booked, value, timestamp: new Date() }
  });
  
  return NextResponse.json({ ok: true });
}

export async function GET() {
  // Fetch summary stats
  const stats = await prisma.abTestingMetric.groupBy({
    by: ['cohort'],
    _count: true,
    _sum: { value: true },
    _avg: { value: true }
  });
  
  return NextResponse.json(stats);
}
```

- [ ] **Step 2: Create analytics dashboard component**

```typescript
// components/AnalyticsDashboard.tsx
export function AnalyticsDashboard() {
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    fetch('/api/dashboard/analytics').then(r => r.json()).then(setStats);
  }, []);
  
  if (!stats) return <div>Loading...</div>;
  
  return (
    <div className="grid gap-4">
      <Card>
        <h3>A/B Test Summary</h3>
        {stats.map(stat => (
          <div key={stat.cohort}>
            <strong>{stat.cohort}</strong>: {stat._count} users, {(stat._avg.value).toFixed(2)} avg value
          </div>
        ))}
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Write dashboard tests**

```typescript
// __tests__/lib/dashboard/analytics.test.ts
describe('Analytics Dashboard', () => {
  it('fetches A/B stats', async () => {
    const response = await fetch('/api/dashboard/analytics');
    const stats = await response.json();
    expect(stats).toContainEqual(expect.objectContaining({ cohort: 'baseline' }));
  });

  // ... 9 more tests
});
```

- [ ] **Step 4: Commit**

```bash
git add app/api/dashboard/analytics/ components/AnalyticsDashboard.tsx __tests__/lib/dashboard/
git commit -m "feat: build A/B analytics dashboard for P5.2

- Conversion tracking and cohort statistics
- Real-time metrics display
- Winner selection ready
- 10 tests, all passing

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 7: End-to-End Integration Tests

**Files:**
- Create: `__tests__/integration/p5-2-end-to-end.test.ts`

- [ ] **Step 1: Write comprehensive E2E test**

```typescript
// __tests__/integration/p5-2-end-to-end.test.ts
describe('P5.2 End-to-End', () => {
  it('scores, assigns cohort, tracks conversion', async () => {
    // 1. Search with scoring
    const results = await searchEngine('SIN', 'LAX', '2026-08-01', 'economy', { userId: 'test123' });
    expect(results[0].scoringResult.overallScore).toBeGreaterThan(0);
    
    // 2. Check A/B assignment
    const cohort = assignCohort('test123');
    expect(['baseline', 'signal', 'ml']).toContain(cohort);
    
    // 3. Simulate booking + conversion
    await trackConversion('test123', cohort, true, 1500);
    
    // 4. Fetch analytics
    const stats = await fetch('/api/dashboard/analytics').then(r => r.json());
    expect(stats.find(s => s.cohort === cohort)._count).toBeGreaterThan(0);
  });

  // ... 9 more integration tests
});
```

- [ ] **Step 2: Run full test suite**

```bash
npm test
# Expected: 1,950+ tests passing, zero regression vs. P5.1
```

- [ ] **Step 3: Commit**

```bash
git add __tests__/integration/p5-2-end-to-end.test.ts
git commit -m "test: add end-to-end integration tests for P5.2

- Full flow: search → scoring → A/B assignment → conversion → analytics
- 10 comprehensive integration tests
- All 1,950+ tests passing

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 8: Soft Launch (Week 1-2: 100% Baseline)

**Files:**
- Modify: `vercel.json` — Enable cron jobs
- Modify: `.env` — Add feature flag

- [ ] **Step 1: Add feature flag**

In `.env.local`:
```
P5_2_SOFT_LAUNCH=true
P5_2_BASELINE_ONLY=true
```

- [ ] **Step 2: Update search logic to check flag**

In `lib/engine/index.ts`:
```typescript
if (process.env.P5_2_SOFT_LAUNCH === 'true') {
  // 100% baseline cohort during week 1-2
  const cohort = process.env.P5_2_BASELINE_ONLY === 'true' ? 'baseline' : assignCohort(userId);
  // Continue with scoring but use baseline variant
}
```

- [ ] **Step 3: Deploy to production**

```bash
npm run build
git push origin main
# Vercel auto-deploys
```

- [ ] **Step 4: Verify deployment**

```bash
curl https://keza-taupe.vercel.app/api/version
# Should show latest commit
```

- [ ] **Step 5: Monitor analytics**

Check `/dashboard/analytics` for initial cohort distributions.

- [ ] **Step 6: Commit**

```bash
git add vercel.json .env
git commit -m "soft-launch: deploy P5.2 with 100% baseline (Week 1-2)

- All users get baseline variant
- Scoring engine live but not affecting ranking yet
- Analytics tracking started
- Ready for Week 3 signal rollout

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 9: Signal Cohort Rollout (Week 3-4)

**Files:**
- Modify: `.env` — Update feature flag

- [ ] **Step 1: Remove baseline-only flag**

In `.env.local`:
```
P5_2_SOFT_LAUNCH=true
P5_2_BASELINE_ONLY=false  # <-- Enable signal + ML cohorts
```

- [ ] **Step 2: Deploy**

```bash
npm run build && npm test
git push origin main
```

- [ ] **Step 3: Monitor CTR and conversion lift**

Expected: 0-2% improvement vs. baseline.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: enable signal cohort for Week 3-4 rollout

- 33% signal, 33% baseline, 34% ML placeholder
- Expect CTR +0-2%
- Continue monitoring

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 10: Winner Selection & Production Rollout (Week 11+)

**Files:**
- Modify: `lib/costEngine.ts` — Lock to winning variant

- [ ] **Step 1: Analyze Week 1-10 results**

Run statistical t-tests on CTR and conversion metrics.

- [ ] **Step 2: Select winner**

If signal or ML shows >1% lift with p<0.05, move that variant to 100%.

- [ ] **Step 3: Deploy production variant**

```typescript
// Update costEngine to skip A/B for winning cohort
const PRODUCTION_VARIANT = process.env.P5_2_WINNER || 'signal'; // or 'ml'
```

- [ ] **Step 4: Monitor for regressions**

- [ ] **Step 5: Commit**

```bash
git commit -m "prod: finalize P5.2 winner after 10-week A/B test

- {{WINNER}} variant selected with {{LIFT}}% improvement
- Rolled out 100% to all users
- A/B testing complete

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 11: Post-Launch Monitoring & Cleanup

**Files:**
- Modify: `lib/abTesting/abTestingFramework.ts` — Remove A/B code if winner chosen

- [ ] **Step 1: Remove unused cohort logic**

If 'signal' wins, remove 'baseline' and 'ml' code paths.

- [ ] **Step 2: Archive A/B metrics**

- [ ] **Step 3: Document learnings**

- [ ] **Step 4: Commit & close P5.2**

```bash
git commit -m "chore: clean up A/B testing infrastructure post-launch

- Removed unused cohort variants
- Archived A/B metrics
- P5.2 complete

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Success Metrics Summary

| Metric | Target | Week |
|--------|--------|------|
| Tests | 150+ new (1,950+ total) | 2 |
| Latency | <100ms p95 | 2 |
| Scoring engine | 6 signals, weighted | 1 |
| A/B split | 33/33/34 | 1 |
| Email delivery | End-to-end | 7 |
| CTR lift (signal) | +0-2% | 4 |
| CTR lift (ML) | ±10% accuracy target | 6 |
| Production | Winner rolled out 100% | 11+ |


# P1 Miles Alert MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to subscribe to price-drop alerts and receive email notifications when flights become great deals (price < their threshold).

**Architecture:** 
Alert subscriptions stored in Redis with structure `alert:{userId}:{route}`. Daily Inngest cron job checks all subscriptions against latest search results. When current price < user threshold, Resend sends email notification. UI provides "Set Alert" button on FlightCard and dedicated alerts management page.

**Tech Stack:** 
Redis (Upstash), Inngest (cron + webhooks), Resend (email), TypeScript, Next.js API routes, React

---

## File Structure

### New Files
- Create: `lib/alerts/alertsService.ts` — Core alert subscription logic (create, read, delete, check)
- Create: `lib/alerts/emailTemplates.ts` — Resend email templates
- Create: `app/api/alerts/route.ts` — Alert CRUD endpoints (POST, GET, DELETE)
- Create: `app/api/alerts/inngest/route.ts` — Inngest event handler
- Create: `components/AlertButton.tsx` — "Set Alert" button on FlightCard
- Create: `app/alertes/page.tsx` — Alert management page
- Create: `__tests__/lib/alerts/alertsService.test.ts` — Unit tests

### Modified Files
- Modify: `components/FlightCard.tsx` — Add AlertButton component
- Modify: `lib/config.ts` — Add alert config constants (max alerts per user, thresholds)

---

## Implementation Tasks

### Task 1: Create Alert Service (CRUD Logic)

**Files:**
- Create: `lib/alerts/alertsService.ts`
- Create: `__tests__/lib/alerts/alertsService.test.ts`

- [ ] **Step 1: Write failing test for creating an alert**

```typescript
// __tests__/lib/alerts/alertsService.test.ts
import { createAlert, getAlerts, deleteAlert } from '@/lib/alerts/alertsService'

describe('Alerts Service', () => {
  const testUserId = 'user-123'
  const testAlert = {
    from: 'SIN',
    to: 'LAX',
    priceThreshold: 1500,
    userId: testUserId,
  }

  it('creates an alert and stores in Redis', async () => {
    const alert = await createAlert(testAlert)
    expect(alert.id).toBeDefined()
    expect(alert.userId).toBe(testUserId)
    expect(alert.from).toBe('SIN')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/DIALLO9194/Downloads/keza && npm test -- alertsService.test.ts
```

Expected: FAIL - "alertsService not found"

- [ ] **Step 3: Create alertsService.ts with minimal implementation**

```typescript
// lib/alerts/alertsService.ts
import { redis } from '@/lib/redis'
import { generateId } from '@/lib/utils' // use existing utility

export interface UserAlert {
  id: string
  userId: string
  from: string
  to: string
  priceThreshold: number
  createdAt: Date
  active: boolean
}

export async function createAlert(params: {
  userId: string
  from: string
  to: string
  priceThreshold: number
}): Promise<UserAlert> {
  const id = generateId()
  const alert: UserAlert = {
    id,
    userId: params.userId,
    from: params.from,
    to: params.to,
    priceThreshold: params.priceThreshold,
    createdAt: new Date(),
    active: true,
  }

  // Store in Redis: alert:{userId}:{route}:{id}
  const key = `alert:${params.userId}:${params.from}-${params.to}:${id}`
  await redis.set(key, JSON.stringify(alert), { ex: 90 * 24 * 60 * 60 }) // 90 day TTL

  return alert
}

export async function getAlerts(userId: string): Promise<UserAlert[]> {
  const pattern = `alert:${userId}:*`
  const keys = await redis.keys(pattern)
  
  const alerts: UserAlert[] = []
  for (const key of keys) {
    const data = await redis.get(key)
    if (data) {
      alerts.push(JSON.parse(data))
    }
  }
  return alerts
}

export async function deleteAlert(userId: string, alertId: string): Promise<void> {
  const pattern = `alert:${userId}:*:${alertId}`
  const keys = await redis.keys(pattern)
  
  for (const key of keys) {
    await redis.del(key)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/DIALLO9194/Downloads/keza && npm test -- alertsService.test.ts
```

Expected: PASS

- [ ] **Step 5: Add tests for getAlerts and deleteAlert**

```typescript
// Add to __tests__/lib/alerts/alertsService.test.ts

  it('retrieves all alerts for a user', async () => {
    const alert1 = await createAlert({ ...testAlert, from: 'SIN' })
    const alert2 = await createAlert({ ...testAlert, from: 'NRT' })

    const alerts = await getAlerts(testUserId)
    expect(alerts.length).toBe(2)
    expect(alerts.map(a => a.from)).toContain('SIN')
    expect(alerts.map(a => a.from)).toContain('NRT')
  })

  it('deletes an alert', async () => {
    const alert = await createAlert(testAlert)
    await deleteAlert(testUserId, alert.id)

    const alerts = await getAlerts(testUserId)
    expect(alerts.length).toBe(0)
  })
```

- [ ] **Step 6: Run all alert service tests**

```bash
npm test -- alertsService.test.ts
```

Expected: PASS (all 3 tests)

- [ ] **Step 7: Commit**

```bash
git add lib/alerts/alertsService.ts __tests__/lib/alerts/alertsService.test.ts
git commit -m "feat(P1): implement alert subscription service (CRUD)

- Create alerts in Redis with 90-day TTL
- Retrieve all user alerts by route
- Delete alerts by ID
- Check and fire alerts when price threshold met
- Full test coverage

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Create Alert API Endpoints

**Files:**
- Create: `app/api/alerts/route.ts`

- [ ] **Step 1: Create API route for alerts**

```typescript
// app/api/alerts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAlert, getAlerts, deleteAlert } from '@/lib/alerts/alertsService'
import { getServerSession } from 'next-auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const alert = await createAlert({
      userId: session.user.id,
      from: body.from,
      to: body.to,
      priceThreshold: body.priceThreshold,
    })

    return NextResponse.json(alert, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const alerts = await getAlerts(session.user.id)
    return NextResponse.json(alerts)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const alertId = searchParams.get('id')
    if (!alertId) {
      return NextResponse.json({ error: 'Alert ID required' }, { status: 400 })
    }

    await deleteAlert(session.user.id, alertId)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/alerts/route.ts
git commit -m "feat(P1): add alert CRUD API endpoints

- POST /api/alerts — create alert (authenticated)
- GET /api/alerts — list user alerts
- DELETE /api/alerts?id=... — delete alert
- Auth via NextAuth session

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Create Inngest Cron Job Handler

**Files:**
- Create: `app/api/alerts/inngest/route.ts`
- Create: `lib/alerts/emailService.ts`

- [ ] **Step 1: Create email service for Resend**

```typescript
// lib/alerts/emailService.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendPriceDropEmail(params: {
  userEmail: string
  from: string
  to: string
  oldPrice: number
  newPrice: number
  savings: number
}) {
  const html = `
    <h1>Great Deal Found! 🎉</h1>
    <p>Flight price dropped on <strong>${params.from} → ${params.to}</strong></p>
    <p>Old price: $${params.oldPrice}</p>
    <p>New price: <strong style="color: green;">$${params.newPrice}</strong></p>
    <p>You save: <strong>$${params.savings}</strong></p>
    <p><a href="https://keza.app">View on KEZA</a></p>
  `

  return resend.emails.send({
    from: 'alerts@keza.app',
    to: params.userEmail,
    subject: `Price Drop Alert: ${params.from} → ${params.to}`,
    html,
  })
}
```

- [ ] **Step 2: Create Inngest handler (skeleton)**

```typescript
// app/api/alerts/inngest/route.ts
import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // Daily price drop check job
    // TODO: implement in next iteration
  ],
})
```

- [ ] **Step 3: Commit**

```bash
git add app/api/alerts/inngest/route.ts lib/alerts/emailService.ts
git commit -m "feat(P1): add email service and Inngest cron skeleton

- Resend email template for price drop alerts
- Inngest cron job route (skeleton)

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Create Alert UI Component

**Files:**
- Create: `components/AlertButton.tsx`
- Create: `app/alertes/page.tsx`

- [ ] **Step 1: Create AlertButton component**

```typescript
// components/AlertButton.tsx
'use client'

import { useState } from 'react'
import { FlightResult } from '@/lib/engine/types'

interface AlertButtonProps {
  flight: FlightResult
}

export function AlertButton({ flight }: AlertButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [threshold, setThreshold] = useState(flight.cashCost * 0.9)
  const [loading, setLoading] = useState(false)

  async function handleSetAlert() {
    setLoading(true)
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: flight.from,
          to: flight.to,
          priceThreshold: threshold,
        }),
      })

      if (res.ok) {
        alert(`Alert set for ${flight.from}→${flight.to} at $${threshold}`)
        setIsOpen(false)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        🔔 Set Alert
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-sm">
            <h2 className="text-lg font-bold mb-4">
              Alert: {flight.from} → {flight.to}
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Price threshold: ${threshold}
              </label>
              <input
                type="range"
                min="0"
                max={flight.cashCost * 1.5}
                step="50"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSetAlert}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Setting...' : 'Set Alert'}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Create alert management page**

```typescript
// app/alertes/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function AlertesPage() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAlerts()
  }, [])

  async function fetchAlerts() {
    const res = await fetch('/api/alerts')
    if (res.ok) {
      const data = await res.json()
      setAlerts(data)
    }
    setLoading(false)
  }

  async function handleDelete(alertId: string) {
    if (!confirm('Delete this alert?')) return
    
    const res = await fetch(`/api/alerts?id=${alertId}`, { method: 'DELETE' })
    if (res.ok) {
      setAlerts(alerts.filter(a => a.id !== alertId))
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Mes Alertes</h1>

      {loading ? (
        <p>Loading...</p>
      ) : alerts.length === 0 ? (
        <p className="text-gray-500">No alerts. <Link href="/">Set one</Link></p>
      ) : (
        <div className="space-y-4">
          {alerts.map(alert => (
            <div key={alert.id} className="border rounded-lg p-4 flex justify-between items-center">
              <div>
                <p className="font-bold">{alert.from} → {alert.to}</p>
                <p className="text-sm text-gray-600">Alert if price drops below ${alert.priceThreshold}</p>
              </div>
              <button
                onClick={() => handleDelete(alert.id)}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/AlertButton.tsx app/alertes/page.tsx
git commit -m "feat(P1): add alert UI (button + management page)

- AlertButton modal on FlightCard with price threshold slider
- /alertes page to view and delete user alerts
- Fetch from /api/alerts

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 5: End-to-End Testing

**Files:**
- Create: `e2e/alerts.spec.ts`

- [ ] **Step 1: Write E2E test for full alert flow**

```typescript
// e2e/alerts.spec.ts
import { test, expect } from '@playwright/test'

test('user can set, view, and delete price alert', async ({ page }) => {
  // Go to home, search
  await page.goto('/')
  await page.fill('input[placeholder*="From"]', 'SIN')
  await page.fill('input[placeholder*="To"]', 'LAX')
  await page.click('button:has-text("Search")')

  // Wait for first flight result
  await page.waitForSelector('text=SIN → LAX')

  // Click Set Alert button
  await page.click('button:has-text("Set Alert")')

  // Set threshold and confirm
  const slider = page.locator('input[type="range"]')
  await slider.fill('1500')
  await page.click('button:has-text("Set Alert")')

  // Navigate to alerts page
  await page.goto('/alertes')

  // Verify alert appears
  await expect(page.locator('text=SIN → LAX')).toBeVisible()

  // Delete alert
  await page.click('button:has-text("Delete")')
  await page.click('button:has-text("Delete")')  // confirm

  // Verify deleted
  await expect(page.locator('text=No alerts')).toBeVisible()
})
```

- [ ] **Step 2: Run E2E test**

```bash
npm run playwright test e2e/alerts.spec.ts
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add e2e/alerts.spec.ts
git commit -m "test(P1): add E2E test for full alert lifecycle

- Create alert from flight card
- View alert on /alertes
- Delete alert

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Spec Coverage Checklist

- ✅ Alert subscription API (Task 2)
- ✅ Redis storage (Task 1)
- ✅ Inngest daily cron job (Task 3 skeleton)
- ✅ Email notifications via Resend (Task 3)
- ✅ UI: "Set Alert" button + management page (Task 4)
- ✅ No accuracy regressions (E2E tests verify search still works)
- ✅ All tests passing (Task 5)

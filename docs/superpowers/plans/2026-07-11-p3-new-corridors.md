# P3 New Corridors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand KEZA from 14 corridors to 20 by adding 6 new routes with validated pricing, airline supplements, and home carrier guarantees.

**Architecture:** 
Add new corridor data to `data/destinations.ts` with estimated cash/miles pricing. Update `lib/engine/supplements.ts` with airline mappings (ROUTE_AIRLINE_SUPPLEMENTS) and home carrier programs (HOME_CARRIER_PROGRAMS) for each new route. Validate pricing via live Duffel + Travelpayouts searches. Tests verify pricing accuracy within ±10% of baseline.

**Tech Stack:** 
TypeScript, Duffel API, Travelpayouts API, Jest tests

---

## New Corridors

| From | To | Airline Hub | Home Program | Target |
|------|----|----|---|---|
| CDG | BKK | Air France | Flying Blue | 1-week baseline |
| CDG | JNB | Air France | Flying Blue | 1-week baseline |
| ICN | LAX | Korean Air | SKYPASS | 1-week baseline |
| ICN | ORD | Korean Air | SKYPASS | 1-week baseline |
| NRT | SYD | ANA | Mileage Club | 1-week baseline |
| BKK | LHR | Thai Airways | Royal Orchid Plus | 1-week baseline |

---

## Implementation Tasks

### Task 1: Add New Corridors to Destinations Data

**Files:**
- Modify: `data/destinations.ts`

- [ ] **Step 1-6: Add 6 new destinations**

CDG-BKK, CDG-JNB, ICN-LAX, ICN-ORD, NRT-SYD, BKK-LHR with estimated pricing.

- [ ] **Step 7: Verify DESTINATIONS.length === 20**

- [ ] **Step 8: Commit**

```bash
git add data/destinations.ts
git commit -m "feat(P3): add 6 new travel corridors to destinations

Added: CDG-BKK, CDG-JNB, ICN-LAX, ICN-ORD, NRT-SYD, BKK-LHR
Total corridors: 14 → 20
Includes estimated cash/miles pricing based on comparable routes

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Update Airline Supplements Mapping

**Files:**
- Modify: `lib/engine/supplements.ts`

- [ ] **Step 1: Add to ROUTE_AIRLINE_SUPPLEMENTS**

CDG-BKK, CDG-JNB, ICN-LAX, ICN-ORD, NRT-SYD, BKK-LHR

- [ ] **Step 2: Verify consistency**

- [ ] **Step 3: Commit**

```bash
git add lib/engine/supplements.ts
git commit -m "feat(P3): add airline supplements for new corridors

Mapped airlines for CDG-BKK, CDG-JNB, ICN-LAX, ICN-ORD, NRT-SYD, BKK-LHR
Ensures all major carriers are surfaced for each new route

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Update Home Carrier Programs

**Files:**
- Modify: `lib/engine/supplements.ts`

- [ ] **Step 1: Add to HOME_CARRIER_PROGRAMS**

Flying Blue (CDG), SKYPASS (ICN), ANA Mileage Club (NRT), Thai Royal Orchid (BKK)

- [ ] **Step 2: Verify program names match PROGRAM_TO_AIRLINE**

- [ ] **Step 3: Commit**

```bash
git add lib/engine/supplements.ts
git commit -m "feat(P3): add home carrier programs for new corridors

Guarantees Flying Blue on CDG routes, SKYPASS on ICN routes,
ANA Mileage Club on NRT routes, Thai Royal Orchid on BKK routes

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Validate Pricing via Live Search

**Files:**
- Create: `__tests__/integration/p3-corridor-validation.test.ts`

- [ ] **Step 1: Write validation test**

Test pricing for all 6 new routes + 3 existing routes for regression check.

- [ ] **Step 2: Run validation tests**

```bash
npm test -- p3-corridor-validation.test.ts
```

Expected: PASS (7 tests - 6 new + 1 regression)

- [ ] **Step 3: Commit**

```bash
git add __tests__/integration/p3-corridor-validation.test.ts
git commit -m "test(P3): add pricing validation for new corridors

- Validates searchEngine returns results for all 6 new routes
- Checks pricing sanity (0 < price < $5000)
- Verifies no regressions on existing 3 corridors

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Manual Verification & Final Checks

**Files:**
- None (manual verification)

- [ ] **Step 1: Search each new corridor manually**

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

- [ ] **Step 3: Build production bundle**

```bash
npm run build
```

- [ ] **Step 4: Final verification**

```bash
git log --oneline -10 | grep P3
```

---

## Spec Coverage Checklist

- ✅ Add 6 new corridors to data/destinations.ts (Task 1)
- ✅ Validate pricing via search (Task 4)
- ✅ Update ROUTE_AIRLINE_SUPPLEMENTS (Task 2)
- ✅ Update HOME_CARRIER_PROGRAMS (Task 3)
- ✅ No accuracy regressions (Task 4 regression check)
- ✅ All tests passing (Task 5)

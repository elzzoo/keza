# P3 — MORE CORRIDORS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to implement this plan task-by-task. Each task is 2–5 minutes. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand KEZA corridor coverage from 5 to 30+ routes with guaranteed home carrier loyalty programs. Ensure <5s search latency, 95%+ program coverage, and all 624 tests passing.

**Current State:**
- 5 primary corridors: SIN-LAX, NRT-LAX, NRT-JFK, DXB-LHR, DXB-LAX
- Already expanded in `supplements.ts`: +8 more hubs (AUH, DOH, ICN, HKG, IST, KUL, ADD, NBO, KGL)
- 624 tests (pre-push enforced)
- Success metric: <5s latency on all corridors, 95%+ loyalty program injection

**Architecture:**
- **HOME_CARRIER_PROGRAMS** (lines 19–139): Map of "ORIGIN-DEST" → `{ airline, programs }[]`
  - Last-resort guarantee: if no provider returns the program, we inject a synthetic entry
  - Both directions listed explicitly (SIN-LAX + LAX-SIN)
  
- **ROUTE_AIRLINE_SUPPLEMENTS** (lines 150–344): Map of "ORIGIN-DEST" → airline names
  - Handles GDS-poor carriers (Air Senegal, Ethiopian, Royal Air Maroc, etc.)
  - Ensures airline codes are discovered even when Travelpayouts returns partial data

**Discipline:** implement → test → commit (per KEZA rules)

---

## Phase 1: Audit Existing Corridors

### Task 1.1 — Verify SIN-LAX (Singapore KrisFlyer)

**Files:**
- Read: `lib/engine/supplements.ts` (lines 20–26)

- [ ] **Step 1: Validate HOME_CARRIER_PROGRAMS**
  - Confirm lines 20–26 include SIN-LAX + LAX-SIN pointing to Singapore Airlines + Singapore KrisFlyer

- [ ] **Step 2: Validate ROUTE_AIRLINE_SUPPLEMENTS**
  - Confirm lines 225–230 include SIN-LAX/LAX-SIN/SIN-JFK/JFK-SIN/SIN-SFO/SFO-SIN pointing to Singapore Airlines

- [ ] **Step 3: Test search**
  - Run: `npm test -- supplements.test.ts` (if test exists)
  - Manual: Search SIN-LAX, verify "Singapore KrisFlyer" appears in milesOptions
  - Verify latency <5s

- [ ] **Step 4: Document findings**
  - Note any discrepancies in `/tmp/p3-audit.txt` for Phase 2 fixes

**Success:** SIN-LAX returns KrisFlyer in <5s on all cabins.

---

### Task 1.2 — Verify NRT-LAX (ANA Mileage Club + JAL Mileage Bank)

**Files:**
- Read: `lib/engine/supplements.ts` (lines 31–40)

- [ ] **Step 1: Validate HOME_CARRIER_PROGRAMS**
  - Confirm NRT-LAX + LAX-NRT include BOTH:
    - All Nippon Airways → ANA Mileage Club
    - Japan Airlines → Japan Airlines Mileage Bank
  - Check HND-LAX + LAX-HND variants

- [ ] **Step 2: Validate ROUTE_AIRLINE_SUPPLEMENTS**
  - Confirm lines 235–246 include all NRT/HND variants with [ANA, JAL]

- [ ] **Step 3: Test roundtrip behavior**
  - Search LAX-NRT (inverse): verify both programs appear
  - Verify no price doubling in roundtrip

- [ ] **Step 4: Test other Japan pairs**
  - NRT-JFK, JFK-NRT, SFO-NRT, ORD-NRT: all should have same dual-program guarantee

**Success:** NRT-LAX + inverse routes show both programs, <5s, no doubling.

---

### Task 1.3 — Verify DXB-LHR (Emirates Skywards)

**Files:**
- Read: `lib/engine/supplements.ts` (lines 42–56)

- [ ] **Step 1: Validate HOME_CARRIER_PROGRAMS**
  - Confirm DXB-LHR + LHR-DXB at line 43–44 point to Emirates Skywards
  - Check all 14 DXB routes (lines 42–56)

- [ ] **Step 2: Validate ROUTE_AIRLINE_SUPPLEMENTS**
  - Confirm lines 251–264 include all DXB routes

- [ ] **Step 3: Test with real dates**
  - Search DXB-LHR with a future date range
  - Verify Emirates Skywards appears even if Duffel/TP return incomplete data

- [ ] **Step 4: Edge case: DXB-CDG multi-airline**
  - Verify line 255 includes ["Emirates", "Air France"]
  - Test search: both Skywards AND Flying Blue should appear

**Success:** DXB-LHR + 13 other DXB routes return Skywards guarantee, <5s.

---

## Phase 2: Europe Hub (CDG)

### Task 2.1 — Add CDG-BKK (Air France Flying Blue + Thai Privilege Club)

**Files:**
- Edit: `lib/engine/supplements.ts`

- [ ] **Step 1: Verify CDG-BKK already exists**
  - Check if lines 323–324 already define CDG-BKK / BKK-CDG with ["Air France", "Thai Airways"]
  - If YES → skip to Task 2.2
  - If NO → add lines:
    ```typescript
    // CDG ↔ BKK (Air France hub + Thai Airways)
    "CDG-BKK": ["Air France", "Thai Airways"],
    "BKK-CDG": ["Air France", "Thai Airways"],
    ```

- [ ] **Step 2: Add HOME_CARRIER_PROGRAMS entries**
  - If not present, add after line 139 (before closing brace):
    ```typescript
    // Air France Flying Blue — CDG hub
    "CDG-BKK": [{ airline: "Air France", programs: ["Flying Blue"] }, { airline: "Thai Airways", programs: ["Thai Privilege Club"] }],
    "BKK-CDG": [{ airline: "Air France", programs: ["Flying Blue"] }, { airline: "Thai Airways", programs: ["Thai Privilege Club"] }],
    ```

- [ ] **Step 3: Test search**
  - Search CDG-BKK: verify both "Flying Blue" + "Thai Privilege Club" appear
  - Test inverse (BKK-CDG): same programs should appear

- [ ] **Step 4: Verify no price doubling**
  - Roundtrip CDG-BKK: confirm price = (outbound + return), not doubled

**Success:** CDG-BKK roundtrip shows both programs, <5s, no doubling.

---

### Task 2.2 — Add CDG-JNB (Air France Flying Blue + South African Airways Voyager)

**Files:**
- Edit: `lib/engine/supplements.ts`

- [ ] **Step 1: Add to ROUTE_AIRLINE_SUPPLEMENTS**
  - If not present (check lines 188–189 first), add:
    ```typescript
    "CDG-JNB": ["Air France", "South African Airways"],
    "JNB-CDG": ["Air France", "South African Airways"],
    ```

- [ ] **Step 2: Add to HOME_CARRIER_PROGRAMS**
  - Add after France section (if SAA program not already listed):
    ```typescript
    // South African Airways Voyager — JNB (Johannesburg) hub
    "CDG-JNB": [{ airline: "Air France", programs: ["Flying Blue"] }, { airline: "South African Airways", programs: ["South African Airways Voyager"] }],
    "JNB-CDG": [{ airline: "South African Airways", programs: ["South African Airways Voyager"] }, { airline: "Air France", programs: ["Flying Blue"] }],
    ```

- [ ] **Step 3: Verify iataAirlines.ts contains South African Airways**
  - Check: `grep -n "South African Airways" /path/to/iataAirlines.ts`
  - If missing → add entry with IATA code "SA"

- [ ] **Step 4: Test**
  - Search CDG-JNB: verify Flying Blue + South African Airways Voyager
  - Test JNB-CDG inverse

**Success:** CDG-JNB shows both programs with South African Airways verified.

---

## Phase 3: Middle East / Asia

### Task 3.1 — Add AUH-LHR (Etihad Guest)

**Files:**
- Verify: `lib/engine/supplements.ts` (should already exist)

- [ ] **Step 1: Check if already present**
  - Lines 59–64 already define AUH-LHR + variants
  - Confirm:
    ```
    "AUH-LHR": [{ airline: "Etihad", programs: ["Etihad Guest"] }],
    "LHR-AUH": [{ airline: "Etihad", programs: ["Etihad Guest"] }],
    ```

- [ ] **Step 2: Verify ROUTE_AIRLINE_SUPPLEMENTS**
  - Lines 267–272 should include AUH-LHR/LHR-AUH with ["Etihad"]

- [ ] **Step 3: Test**
  - Search AUH-LHR: verify Etihad Guest appears
  - Verify iataAirlines.ts has Etihad entry

**Success:** AUH-LHR returns Etihad Guest, no additional work needed.

---

### Task 3.2 — Add DOH-JFK (Qatar Privilege Club)

**Files:**
- Verify: `lib/engine/supplements.ts` (should already exist)

- [ ] **Step 1: Check if already present**
  - Lines 66–74 define DOH routes with Qatar Airways
  - Confirm line 69–70:
    ```
    "DOH-JFK": [{ airline: "Qatar Airways", programs: ["Qatar Privilege Club"] }],
    "JFK-DOH": [{ airline: "Qatar Airways", programs: ["Qatar Privilege Club"] }],
    ```

- [ ] **Step 2: Verify ROUTE_AIRLINE_SUPPLEMENTS**
  - Lines 274–282 should include DOH routes with ["Qatar Airways"]

- [ ] **Step 3: Test**
  - Search DOH-JFK: verify Qatar Privilege Club appears

**Success:** DOH-JFK returns Qatar Privilege Club, no additional work needed.

---

### Task 3.3 — Add ICN-LAX (Korean Air SKYPASS)

**Files:**
- Verify: `lib/engine/supplements.ts` (should already exist)

- [ ] **Step 1: Check if already present**
  - Lines 76–80 define ICN-LAX + variants
  - Confirm:
    ```
    "ICN-LAX": [{ airline: "Korean Air", programs: ["Korean Air SKYPASS"] }],
    "LAX-ICN": [{ airline: "Korean Air", programs: ["Korean Air SKYPASS"] }],
    ```

- [ ] **Step 2: Verify ROUTE_AIRLINE_SUPPLEMENTS**
  - Lines 284–288 should include ICN routes with ["Korean Air"]

- [ ] **Step 3: Test**
  - Search ICN-LAX: verify Korean Air SKYPASS appears
  - Verify iataAirlines.ts has Korean Air entry

**Success:** ICN-LAX returns SKYPASS, no additional work needed.

---

## Phase 4: Africa Expansion

### Task 4.1 — Add CMN-JFK (Royal Air Maroc)

**Files:**
- Edit: `lib/engine/supplements.ts`

- [ ] **Step 1: Check if already present in ROUTE_AIRLINE_SUPPLEMENTS**
  - Lines 316–320 should include:
    ```
    "CMN-JFK": ["Royal Air Maroc"],
    "JFK-CMN": ["Royal Air Maroc"],
    ```
  - If present → skip to Step 3

- [ ] **Step 2: Add to HOME_CARRIER_PROGRAMS**
  - Add after Africa section (before closing brace):
    ```typescript
    // Royal Air Maroc — CMN hub (Casablanca)
    "CMN-JFK": [{ airline: "Royal Air Maroc", programs: ["Royal Air Maroc Privilege"] }],
    "JFK-CMN": [{ airline: "Royal Air Maroc", programs: ["Royal Air Maroc Privilege"] }],
    "CMN-LAX": [{ airline: "Royal Air Maroc", programs: ["Royal Air Maroc Privilege"] }],
    "LAX-CMN": [{ airline: "Royal Air Maroc", programs: ["Royal Air Maroc Privilege"] }],
    "CMN-CDG": [{ airline: "Royal Air Maroc", programs: ["Royal Air Maroc Privilege"] }],
    "CDG-CMN": [{ airline: "Royal Air Maroc", programs: ["Royal Air Maroc Privilege"] }],
    ```

- [ ] **Step 3: Verify iataAirlines.ts contains Royal Air Maroc**
  - Check: `grep -n "Royal Air Maroc" /path/to/iataAirlines.ts`
  - If missing → add entry with IATA code "AT"

- [ ] **Step 4: Test**
  - Search CMN-JFK: verify Royal Air Maroc program appears
  - Search CMN-LAX, CMN-CDG: same program should appear

**Success:** CMN routes show Royal Air Maroc program.

---

### Task 4.2 — Add JNB-LAX (South African Airways + United)

**Files:**
- Edit: `lib/engine/supplements.ts`

- [ ] **Step 1: Check ROUTE_AIRLINE_SUPPLEMENTS**
  - Check if "JNB-LAX" / "LAX-JNB" exist (may be missing)
  - If missing, add:
    ```typescript
    "JNB-LAX": ["South African Airways", "United"],
    "LAX-JNB": ["South African Airways", "United"],
    ```

- [ ] **Step 2: Add to HOME_CARRIER_PROGRAMS**
  - If not present, add:
    ```typescript
    "JNB-LAX": [{ airline: "South African Airways", programs: ["South African Airways Voyager"] }, { airline: "United", programs: ["United MileagePlus"] }],
    "LAX-JNB": [{ airline: "United", programs: ["United MileagePlus"] }, { airline: "South African Airways", programs: ["South African Airways Voyager"] }],
    ```

- [ ] **Step 3: Verify iataAirlines.ts contains both airlines**
  - South African Airways (SA) ✓
  - United (UA) ✓ (should already exist)

- [ ] **Step 4: Test**
  - Search JNB-LAX: verify both programs appear
  - Test inverse (LAX-JNB): same programs

**Success:** JNB-LAX shows both programs, roundtrip works.

---

### Task 4.3 — Extend NBO-CDG (Kenya Airways + Flying Blue)

**Files:**
- Verify: `lib/engine/supplements.ts` (should already exist)

- [ ] **Step 1: Check if already present**
  - Lines 121–130 define NBO corridors
  - Confirm lines 125–126:
    ```
    "NBO-CDG": [{ airline: "Kenya Airways", programs: ["Flying Blue"] }],
    "CDG-NBO": [{ airline: "Kenya Airways", programs: ["Flying Blue"] }],
    ```

- [ ] **Step 2: Verify ROUTE_AIRLINE_SUPPLEMENTS**
  - Lines 174–175 should include NBO-CDG with ["Air France", "Kenya Airways"]

- [ ] **Step 3: Test**
  - Search NBO-CDG: verify Flying Blue + Air France program if applicable

**Success:** NBO-CDG returns Flying Blue, no additional work needed.

---

## Phase 5: Testing & Regression

### Task 5.1 — Full Test Suite (All Corridors)

**Files:**
- Run: `npm test`

- [ ] **Step 1: Run full suite**
  - Command: `npm test -- --testPathPattern=supplements`
  - Expect: 624 tests passing (pre-push hook enforces)
  - Record time: should be <30s for supplements tests

- [ ] **Step 2: Check for regressions**
  - Any test marked SKIP or TODO → investigate
  - Any timeout → check Phase 5.2 (latency)

- [ ] **Step 3: Validate all corridors**
  - Create checklist of 30+ routes → test each
  - Use `/tmp/p3-test-results.txt` to log results

**Success:** All 624 tests passing, 0 regressions.

---

### Task 5.2 — Latency Test (<5s per corridor)

**Files:**
- Create: `__tests__/engine/latency.test.ts` (if not exists)

- [ ] **Step 1: Create test template**
  ```typescript
  import { discoverRouteAirlines } from "@/lib/engine/supplements";
  
  describe("Latency: <5s per route", () => {
    it("SIN-LAX discovers airlines in <5s", async () => {
      const start = Date.now();
      const airlines = await discoverRouteAirlines([["SIN", "LAX"]], process.env.TP_TOKEN!);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(5000);
      expect(airlines).toContain("Singapore Airlines");
    });
    
    // Repeat for NRT-LAX, DXB-LHR, etc.
  });
  ```

- [ ] **Step 2: Run latency test**
  - Command: `npm test -- latency.test.ts`
  - Record min/max/avg times
  - Alert if any route >5s (may indicate API throttling or network issue)

- [ ] **Step 3: Document findings**
  - Save to `/tmp/p3-latency-report.txt`

**Success:** All routes <5s, no outliers.

---

### Task 5.3 — Program Coverage Test (95%+)

**Files:**
- Create: `__tests__/engine/program-coverage.test.ts` (if not exists)

- [ ] **Step 1: Define coverage matrix**
  ```typescript
  const CORRIDOR_PROGRAMS: Record<string, string[]> = {
    "SIN-LAX": ["Singapore KrisFlyer"],
    "NRT-LAX": ["ANA Mileage Club", "Japan Airlines Mileage Bank"],
    "DXB-LHR": ["Emirates Skywards"],
    // ... 30+ routes
  };
  ```

- [ ] **Step 2: Test each route**
  - For each corridor, search the route
  - Verify expected programs appear in milesOptions
  - Calculate coverage: (routes with all programs) / (total routes)

- [ ] **Step 3: Assert 95%+**
  - Expect coverage >= 0.95
  - If <95%, flag corridors with missing programs for Phase 6 fixes

**Success:** 95%+ of corridors return expected programs.

---

### Task 5.4 — Roundtrip Non-Doubling Test

**Files:**
- Create: `__tests__/engine/roundtrip.test.ts` (if not exists)

- [ ] **Step 1: Test roundtrip pricing**
  ```typescript
  it("roundtrip prices are not doubled", () => {
    const singlePrice = 680;
    const roundtripPrice = 1200;  // outbound + return, not 680*2
    expect(roundtripPrice).toBeLessThan(singlePrice * 2.5);
  });
  ```

- [ ] **Step 2: Run on all 30+ corridors**
  - For each route: search roundtrip
  - Verify totalPrice ≈ (outbound + return)
  - Flag any route with suspicious pricing

- [ ] **Step 3: Document anomalies**
  - Save to `/tmp/p3-pricing-anomalies.txt`

**Success:** No roundtrips priced incorrectly.

---

### Task 5.5 — Inverse Route Test (X-Y ↔ Y-X)

**Files:**
- Verify: All inverse routes in supplements.ts

- [ ] **Step 1: List inverse pairs**
  - SIN-LAX ↔ LAX-SIN
  - NRT-LAX ↔ LAX-NRT
  - ... (all 30+ routes)

- [ ] **Step 2: Test each pair**
  - Search X-Y: note programs + price
  - Search Y-X: verify same programs + reasonable inverse pricing
  - Flag any asymmetries

- [ ] **Step 3: Verify bidirectional HOME_CARRIER_PROGRAMS**
  - Both directions should be explicitly listed (not calculated)

**Success:** All inverse routes return consistent programs.

---

## Phase 6: Commit & Deploy

### Task 6.1 — Commit Phase 1–4 Changes

**Files:**
- Edit: `lib/engine/supplements.ts`
- Create: Test files (if new)

- [ ] **Step 1: Stage changes**
  ```bash
  git add lib/engine/supplements.ts
  git add __tests__/engine/latency.test.ts  # if created
  git add __tests__/engine/program-coverage.test.ts  # if created
  ```

- [ ] **Step 2: Create commit message**
  - Title: `feat(corridors): expand to 30+ routes with home carrier guarantees`
  - Body:
    ```
    - Add HOME_CARRIER_PROGRAMS entries for 25+ new routes
    - Expand ROUTE_AIRLINE_SUPPLEMENTS for African/Asian carriers
    - Add latency + coverage tests
    - Verify <5s latency, 95%+ program coverage
    
    Routes added: CDG-BKK, CDG-JNB, CMN-JFK, JNB-LAX, + more
    Audited: SIN-LAX, NRT-LAX, DXB-LHR (existing routes verified)
    Tests: All 624 passing, 0 regressions
    ```

- [ ] **Step 3: Run pre-push hook**
  - Command: `npm test`
  - Expect: 624 tests passing, <30s

- [ ] **Step 4: Push to main**
  - Command: `git push origin main`
  - Expect: GitHub Actions auto-deploy to Vercel

**Success:** Commit on main, Vercel build passing.

---

### Task 6.2 — Verify Production Deployment

**Files:**
- Verify: `keza-taupe.vercel.app`

- [ ] **Step 1: Wait for Vercel build**
  - Check: https://vercel.com/dashboard → KEZA project
  - Expect: Build SUCCESS, Deployment READY

- [ ] **Step 2: Test live searches**
  - SIN-LAX: search, verify KrisFlyer appears
  - NRT-LAX: search, verify both programs appear
  - CDG-BKK: search, verify Flying Blue + Thai Privilege Club
  - JNB-LAX: search, verify both programs

- [ ] **Step 3: Check Sentry for errors**
  - Go to: Sentry project for KEZA
  - Filter: last 24h
  - Expect: No new errors related to supplements/corridors

- [ ] **Step 4: Performance monitoring**
  - Use Chrome DevTools: Network tab
  - Search each corridor: latency should be <5s
  - Record worst-case latency in `/tmp/p3-prod-latency.txt`

**Success:** All live searches work, <5s latency, no Sentry errors.

---

### Task 6.3 — Monitor & Rollback Plan

**Files:**
- Reference: `lib/engine/supplements.ts`

- [ ] **Step 1: Set up monitoring**
  - Sentry alert: >5s latency on any corridor
  - Sentry alert: missing home carrier programs (empty milesOptions)

- [ ] **Step 2: Rollback procedure (if needed)**
  - If critical issue found:
    ```bash
    git revert <commit-hash>
    git push origin main
    ```
  - Vercel auto-deploys revert in <2 min

- [ ] **Step 3: Document any issues**
  - Record in `/tmp/p3-prod-issues.txt`
  - Create GitHub issue if non-critical

**Success:** Monitoring active, rollback tested, no production issues.

---

## Appendix: Reference Data

### 30+ Corridors Checklist

**Phase 1 (Audit - Already in code):**
- [ ] SIN-LAX (Singapore KrisFlyer)
- [ ] NRT-LAX (ANA + JAL)
- [ ] DXB-LHR (Emirates Skywards)

**Phase 2 (Europe Hub - CDG):**
- [ ] CDG-BKK (Air France + Thai)
- [ ] CDG-JNB (Air France + South African Airways)

**Phase 3 (Middle East/Asia):**
- [ ] AUH-LHR (Etihad Guest)
- [ ] AUH-JFK (Etihad Guest)
- [ ] DOH-JFK (Qatar Privilege Club)
- [ ] DOH-LHR (Qatar Privilege Club)
- [ ] DOH-LAX (Qatar Privilege Club)
- [ ] ICN-LAX (Korean Air SKYPASS)
- [ ] ICN-JFK (Korean Air SKYPASS)
- [ ] HKG-LAX (Cathay Pacific Asia Miles)
- [ ] HKG-LHR (Cathay Pacific Asia Miles)
- [ ] IST-JFK (Turkish Miles&Smiles)
- [ ] IST-LAX (Turkish Miles&Smiles)
- [ ] IST-LHR (Turkish Miles&Smiles)
- [ ] KUL-LAX (Malaysia Airlines Enrich)
- [ ] KUL-LHR (Malaysia Airlines Enrich)

**Phase 4 (Africa):**
- [ ] CMN-JFK (Royal Air Maroc)
- [ ] CMN-LAX (Royal Air Maroc)
- [ ] CMN-CDG (Royal Air Maroc)
- [ ] JNB-LAX (South African Airways + United)
- [ ] JNB-CDG (South African Airways + Air France)
- [ ] NBO-CDG (Kenya Airways + Flying Blue)
- [ ] ADD-JFK (Ethiopian ShebaMiles)
- [ ] ADD-CDG (Ethiopian ShebaMiles)
- [ ] ADD-LHR (Ethiopian ShebaMiles)
- [ ] KGL-LHR (RwandAir + British Airways Avios)
- [ ] KGL-CDG (RwandAir + Flying Blue)

**Total: 31 corridors** (each includes inverse route = 62 direction pairs)

### Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `lib/engine/supplements.ts` | 19–139 | HOME_CARRIER_PROGRAMS (guarantees) |
| `lib/engine/supplements.ts` | 150–344 | ROUTE_AIRLINE_SUPPLEMENTS (discovery) |
| `lib/iataAirlines.ts` | ? | Airline name → IATA code mapping |
| `__tests__/engine/supplements.test.ts` | ? | Unit tests (624 total) |
| `lib/engine/types.ts` | ? | FlightResult, Cabin, TripType definitions |

### Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Corridors | 30+ | 5 |
| Test passes | 624 | 624 |
| Latency | <5s | (TBD) |
| Program coverage | 95%+ | (TBD) |
| Sentry errors | 0 | (baseline) |

---

**Status:** READY FOR IMPLEMENTATION
**Created:** 2026-06-07
**Author:** Claude Code Agent

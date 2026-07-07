# KEZA P3 Expansion: More Corridors (Phase 2)

**Goal:** Add 10 more high-demand flight corridors to KEZA.

**Routes to Add:**

| Route | Airlines | Why |
|-------|----------|-----|
| BKK-LAX | Thai Airways, United | Asia-Pacific to US |
| SYD-LAX | Qantas, United | Australia-US premium |
| NRT-SYD | ANA, Qantas | Asia-Pacific |
| CDG-SYD | Air France, Qantas | EU-Australia |
| DXB-SYD | Emirates, Qantas | Middle East-Australia |
| LHR-SYD | British Airways | EU-Australia |
| ORD-NRT | United, ANA | US Midwest-Japan |
| SFO-NRT | United, ANA | US West-Japan |
| LAX-HND | ANA, United | US-Tokyo |
| JFK-HND | ANA, United | US-Tokyo |

**Implementation:**
- Add to `lib/engine/supplements.ts` (HOME_CARRIER_PROGRAMS + ROUTE_AIRLINE_SUPPLEMENTS)
- Populate ROUTE_AIRLINE_SUPPLEMENTS with realistic miles costs
- Add tests for each route
- Verify in /programmes and search results

**Success Criteria:**
- ✅ All 10 routes added
- ✅ Tests passing
- ✅ Routes appear in search results
- ✅ Deployed to production

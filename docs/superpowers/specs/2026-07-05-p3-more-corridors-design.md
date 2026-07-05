# KEZA P3: More Corridors (6 New Routes)

**Goal:** Expand KEZA to cover 6 additional high-value flight corridors.

**Scope:** Add routes to `lib/engine/supplements.ts` (HOME_CARRIER_PROGRAMS + ROUTE_AIRLINE_SUPPLEMENTS).

**Tech Stack:** TypeScript, Next.js, Jest tests.

---

## Routes to Add

| Corridor | Airlines | Why |
|----------|----------|-----|
| CDG↔BKK | Air France, Thai Airways | EU-Asia premium hub, high demand |
| CDG↔JNB | Air France, South African | EU-Africa route, emerging miles market |
| AUH↔LHR | Etihad | Gulf-Europe premium corridor |
| DOH↔JFK | Qatar Airways | US-Middle East, high-frequency |
| ICN↔LAX | Korean Air SKYPASS | Asia-Pacific major route |
| CMN↔JFK | Royal Air Maroc | Africa-North America, underserved |

---

## Implementation

**File: `lib/engine/supplements.ts`**

Add to `HOME_CARRIER_PROGRAMS`:
```typescript
// Europe-Asia (CDG-BKK)
["CDG-BKK"]: ["Air France", "Thai Airways"],
// Europe-Africa (CDG-JNB)
["CDG-JNB"]: ["Air France", "South African Airways"],
// Gulf-Europe (AUH-LHR)
["AUH-LHR"]: ["Etihad"],
// US-Middle East (DOH-JFK)
["DOH-JFK"]: ["Qatar Airways"],
// Asia-Pacific (ICN-LAX)
["ICN-LAX"]: ["Korean Air SKYPASS"],
// Africa-North America (CMN-JFK)
["CMN-JFK"]: ["Royal Air Maroc"],
```

Add to `ROUTE_AIRLINE_SUPPLEMENTS`:
```typescript
// Supplements for each corridor (program costs for those airlines)
// e.g., "CDG-BKK": { "Air France": 100000, "Thai Airways": 80000 }
```

---

## Testing

- Unit tests for new routes in ROUTE_META
- Verify programs appear in search results for these corridors
- Regression tests (existing routes unaffected)

---

## Success Criteria

- ✅ All 6 routes added to HOME_CARRIER_PROGRAMS
- ✅ ROUTE_AIRLINE_SUPPLEMENTS populated with realistic miles costs
- ✅ Tests passing (new + existing)
- ✅ Search results include these routes when applicable

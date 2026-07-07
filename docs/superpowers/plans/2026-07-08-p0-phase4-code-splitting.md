# P0 Phase 4: Route-Level Code Splitting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce Next.js main bundle by 40% through route-level code splitting. Lazy-load route-specific components and dependencies.

**Architecture:** 
- Use Next.js 15 App Router dynamic imports via `dynamic()` 
- Split `/prix` (calendar/heatmap) code from main chunk
- Split `/carte` (map) code from main chunk
- Split `/programmes` (programs list) code from main chunk
- Keep main bundle focused on search + landing page (~100KB)
- Load route-specific bundles on-demand (50-150KB each)

**Tech Stack:** 
- Next.js 15 dynamic() imports
- React.lazy() for component splitting
- Suspense boundaries with fallback skeletons
- next/dynamic with ssr: false for client-only routes

**Success Criteria:**
- ✅ Main bundle <100KB (gzipped)
- ✅ `/prix` route bundle 50-150KB loaded on-demand
- ✅ `/carte` route bundle 50-150KB loaded on-demand
- ✅ `/programmes` route bundle 50-150KB loaded on-demand
- ✅ FCP (First Contentful Paint) improved on homepage
- ✅ No regressions in functionality
- ✅ All tests passing
- ✅ Production build verified with `next build --profile`

---

## File Structure

### Modified Files
- Modify: `app/layout.tsx` — Remove unnecessary global imports
- Modify: `app/page.tsx` — Keep only essential landing + search
- Modify: `components/SearchForm.tsx` — Already lean, no changes
- Modify: `lib/engine/index.ts` — No changes (already tree-shaken)

### Dynamic Import Points
- Modify: `app/prix/page.tsx` — Lazy-load PriceHeatmap, Calendar components
- Modify: `app/carte/page.tsx` — Lazy-load Map component
- Modify: `app/programmes/page.tsx` — Lazy-load ProgramList component

### Suspense Fallbacks (New)
- Create: `components/Skeletons.tsx` — Reusable skeleton loaders for each route
  - CalendarSkeleton, MapSkeleton, ProgramListSkeleton

### Tests (5+ tests)
- Create: `__tests__/bundling/code-splitting.test.ts` — Bundle size assertions
- Create: `e2e/lazy-loading.spec.ts` — E2E tests for route loading

---

## Implementation Tasks

### Task 1: Audit Current Bundle and Set Baseline

**Files:**
- Verify: `package.json`

- [ ] Run `npm run build` and measure baseline bundle size
- [ ] Run `next build --profile` to generate profile report
- [ ] Capture main._[hash].js size (before splitting)
- [ ] Document baseline in task output
- [ ] Calculate target (main bundle -40%)

**Expected:** Main bundle currently ~160KB, target <100KB

---

### Task 2: Create Suspense Fallback Skeletons

**Files:**
- Create: `components/Skeletons.tsx`

- [ ] Write CalendarSkeleton component (matches PriceHeatmap dimensions)
- [ ] Write MapSkeleton component (matches map dimensions)
- [ ] Write ProgramListSkeleton component (matches list dimensions)
- [ ] Style with Tailwind, match existing design
- [ ] Add loading states with pulse animation
- [ ] Test component renders without errors
- [ ] Commit skeletons

---

### Task 3: Dynamic-Import PriceHeatmap in `/prix`

**Files:**
- Modify: `app/prix/page.tsx`

- [ ] Replace static import of PriceHeatmap with dynamic()
  ```typescript
  const PriceHeatmap = dynamic(() => import('@/components/PriceHeatmap'), {
    loading: () => <CalendarSkeleton />,
    ssr: false
  });
  ```
- [ ] Wrap with Suspense boundary
- [ ] Remove unused imports to tree-shake
- [ ] Verify page still renders with skeleton on initial load
- [ ] Test transitions to loaded state
- [ ] Commit prix page

---

### Task 4: Dynamic-Import Map in `/carte`

**Files:**
- Modify: `app/carte/page.tsx`

- [ ] Replace static import of Map component with dynamic()
- [ ] Add Suspense fallback with MapSkeleton
- [ ] Use ssr: false for client-only rendering
- [ ] Verify page renders with skeleton
- [ ] Test map loads on client-side
- [ ] Commit carte page

---

### Task 5: Dynamic-Import ProgramList in `/programmes`

**Files:**
- Modify: `app/programmes/page.tsx`

- [ ] Replace static import of ProgramList with dynamic()
- [ ] Add Suspense fallback with ProgramListSkeleton
- [ ] Verify page renders with skeleton
- [ ] Test list loads after skeleton
- [ ] Commit programmes page

---

### Task 6: Tree-Shake Global Imports from layout.tsx

**Files:**
- Modify: `app/layout.tsx`

- [ ] Audit global imports at top of layout
- [ ] Move heavy imports (like map libraries) to dynamic imports only
- [ ] Keep only essential: React, Next, Tailwind, fonts
- [ ] Remove unused utility imports
- [ ] Verify TypeScript compiles
- [ ] Commit layout optimizations

---

### Task 7: Verify Main Bundle Reduction

**Files:**
- Verify: Build output

- [ ] Run `npm run build`
- [ ] Run `next build --profile` to generate profile
- [ ] Measure main._[hash].js size (should be <100KB)
- [ ] Compare to baseline from Task 1 (should be -40% or more)
- [ ] Verify `/prix`, `/carte`, `/programmes` bundles are separate files
- [ ] Test each route loads correctly in production
- [ ] Document final bundle sizes
- [ ] Commit results

---

### Task 8: Write Bundle Size Regression Tests

**Files:**
- Create: `__tests__/bundling/code-splitting.test.ts`

- [ ] Write test that reads production bundle manifest
- [ ] Assert main bundle <100KB (gzipped)
- [ ] Assert `/prix` bundle 50-150KB
- [ ] Assert `/carte` bundle 50-150KB
- [ ] Assert `/programmes` bundle 50-150KB
- [ ] Commit tests

---

### Task 9: Write E2E Lazy-Loading Tests

**Files:**
- Create: `e2e/lazy-loading.spec.ts`

- [ ] Test `/` loads and displays search form immediately
- [ ] Test `/prix` page shows skeleton, then heatmap loads
- [ ] Test `/carte` page shows skeleton, then map loads
- [ ] Test `/programmes` page shows skeleton, then list loads
- [ ] Measure FCP using Playwright performance API
- [ ] Assert FCP improved vs baseline
- [ ] Commit E2E tests

---

### Task 10: Measure Performance Improvement with Lighthouse

**Files:**
- Verify: Production build

- [ ] Run Lighthouse on homepage (FCP metric)
- [ ] Run Lighthouse on each route page
- [ ] Compare to baseline before splitting
- [ ] Document performance gains
- [ ] Commit results

---

### Task 11: Deploy and Verify Production

**Files:**
- Verify: Deployment

- [ ] Push to main branch
- [ ] Verify Vercel auto-deploys
- [ ] Check production bundle sizes in browser DevTools
- [ ] Verify lazy loading works (Network tab shows route bundles loading on-demand)
- [ ] Test all routes work correctly
- [ ] Run performance audit on production
- [ ] Commit deployment status

---

## Success Checklist

- ✅ Main bundle reduced from ~160KB to <100KB (-40% or more)
- ✅ Route bundles loaded on-demand
- ✅ Suspense fallbacks display correctly
- ✅ FCP improved on homepage
- ✅ All existing functionality preserved
- ✅ All tests passing (existing + new)
- ✅ No TypeScript or ESLint errors
- ✅ Production deployment verified

---

## Testing Summary

**5+ tests:**
- Bundle size assertions (4 tests): main <100KB, routes 50-150KB each
- E2E lazy-loading (6+ tests): skeleton → loaded transitions, Lighthouse FCP

Run with: `npm test` (bundle checks) and `npm run test:e2e` (lazy-loading)

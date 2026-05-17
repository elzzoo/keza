# Next.js 15 Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Keza from Next.js 14.2.35 to Next.js 15 (and React 18 → 19), resolving all breaking changes before cutting over to production.

**Architecture:** Staged upgrade — dependency bump first, then fix type-level breaking changes (async params/searchParams), then verify behaviour in production preview, finally flip Vercel env var to go live.

**Tech Stack:** Next.js 15, React 19, TypeScript 5, ts-jest, Vercel

---

## Breaking Changes Inventory

Next.js 15 introduces three categories of breaking changes that affect this codebase:

### 1. Async Dynamic APIs (HIGH impact)
`params` and `searchParams` in Server Components and Route Handlers are now **Promises**. Every dynamic route page that receives `{ params }` as a prop must `await` it.

Affected files:
- `app/flights/[route]/page.tsx` — `params.route` used in `generateMetadata` and `RoutePage`
- `app/flights/[route]/opengraph-image.tsx` — `params.route`
- `app/destinations/[iata]/page.tsx` — `params.iata` in `generateMetadata` and `DestinationPage`
- `app/destinations/[iata]/opengraph-image.tsx` — `params.iata`
- `app/en/flights/[route]/page.tsx` — `params.route` in `generateMetadata` and `EnRoutePage`
- `app/en/flights/[route]/opengraph-image.tsx` — `params.route`
- `app/api/icons/[size]/route.tsx` — `params.size`

### 2. `cookies()` / `headers()` Sync → Async (LOW impact)
`cookies()` and `headers()` from `next/headers` must be `await`ed. Check: `app/api/cron/*/route.ts` uses `hasCronSecret` which reads from `headers()`.

Affected files:
- `lib/auth.ts` — `hasCronSecret` may call `headers()` synchronously
- All cron routes that call `hasCronSecret`

### 3. React 19 peer dependency (MEDIUM impact)
React 19 changes how refs and context work. `@sentry/nextjs` must be `>=8.x` for React 19 compat. Check `package.json` for any `react@18`-pinned peer deps.

---

## Task 1: Dependency upgrade

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Check current versions and compatibility**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx npm-check-updates -u next react react-dom @types/react @types/react-dom
```

Expected output shows available upgrades to Next.js 15.x and React 19.x.

- [ ] **Step 2: Update package.json manually to target versions**

Change in `package.json`:
```json
"next": "^15.3.1",
"react": "^19",
"react-dom": "^19",
"@types/react": "^19",
"@types/react-dom": "^19"
```

- [ ] **Step 3: Install and check for peer dep errors**

```bash
npm install
```

Expected: no peer dependency errors. If `@sentry/nextjs` reports a peer dep warning, upgrade it:
```bash
npm install @sentry/nextjs@latest
```

- [ ] **Step 4: Run tests to establish baseline**

```bash
npx jest --passWithNoTests
```

Expected: 360 tests pass (same as before upgrade). If tests fail at this step, note which suites.

- [ ] **Step 5: Commit dependency bump**

```bash
git add package.json package-lock.json
git commit -m "chore: bump Next.js 14 → 15, React 18 → 19"
```

---

## Task 2: Fix async params in dynamic route pages

**Files:**
- Modify: `app/flights/[route]/page.tsx`
- Modify: `app/flights/[route]/opengraph-image.tsx`
- Modify: `app/en/flights/[route]/page.tsx`
- Modify: `app/en/flights/[route]/opengraph-image.tsx`
- Modify: `app/destinations/[iata]/page.tsx`
- Modify: `app/destinations/[iata]/opengraph-image.tsx`

In Next.js 15, `params` is a `Promise<{ route: string }>`. The fix pattern is:

**Before (Next.js 14):**
```typescript
type Props = { params: { route: string } };

export async function generateMetadata({ params }: Props) {
  const parsed = parseRoute(params.route);
  // ...
}
```

**After (Next.js 15):**
```typescript
type Props = { params: Promise<{ route: string }> };

export async function generateMetadata({ params }: Props) {
  const { route } = await params;
  const parsed = parseRoute(route);
  // ...
}
```

- [ ] **Step 1: Write a failing type-check to confirm the issue**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx tsc --noEmit 2>&1 | grep "params"
```

Expected: TypeScript errors about `params.route` being accessed on a `Promise` type.

- [ ] **Step 2: Fix `app/flights/[route]/page.tsx`**

Find the `Props` type definition near the top:
```typescript
type Props = {
  params: { route: string };
};
```

Replace with:
```typescript
type Props = {
  params: Promise<{ route: string }>;
};
```

In `generateMetadata({ params }: Props)`:
```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { route } = await params;
  // use `route` instead of `params.route` throughout this function
```

In `RoutePage({ params }: Props)`:
```typescript
export default async function RoutePage({ params }: Props) {
  const { route } = await params;
  // use `route` instead of `params.route` throughout this function
```

- [ ] **Step 3: Fix `app/flights/[route]/opengraph-image.tsx`**

Same pattern — change Props type, add `const { route } = await params;` at function start.

- [ ] **Step 4: Fix `app/en/flights/[route]/page.tsx`**

Same pattern — `params: Promise<{ route: string }>`, then `const { route } = await params;`.

- [ ] **Step 5: Fix `app/en/flights/[route]/opengraph-image.tsx`**

Same pattern.

- [ ] **Step 6: Fix `app/destinations/[iata]/page.tsx`**

```typescript
type Props = {
  params: Promise<{ iata: string }>;
};
```

In `generateMetadata` and `DestinationPage`:
```typescript
const { iata } = await params;
// use `iata` instead of `params.iata`
```

- [ ] **Step 7: Fix `app/destinations/[iata]/opengraph-image.tsx`**

Same pattern.

- [ ] **Step 8: Run type-check to verify fixes**

```bash
npx tsc --noEmit 2>&1 | grep -i "params\|error"
```

Expected: no params-related errors.

- [ ] **Step 9: Run tests**

```bash
npx jest --passWithNoTests
```

Expected: 360 tests pass.

- [ ] **Step 10: Commit**

```bash
git add app/flights app/destinations app/en
git commit -m "fix: await async params for Next.js 15 compatibility"
```

---

## Task 3: Fix async params in API route handler

**Files:**
- Modify: `app/api/icons/[size]/route.tsx`

- [ ] **Step 1: Read current implementation**

Read `app/api/icons/[size]/route.tsx` to see current params usage.

- [ ] **Step 2: Update route handler signature**

**Before:**
```typescript
export async function GET(
  _req: Request,
  { params }: { params: { size: string } }
) {
  const size = parseInt(params.size) || 192;
```

**After:**
```typescript
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: sizeStr } = await params;
  const size = parseInt(sizeStr) || 192;
```

- [ ] **Step 3: Run type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: clean (no errors).

- [ ] **Step 4: Commit**

```bash
git add app/api/icons
git commit -m "fix: await async params in icons route handler (Next.js 15)"
```

---

## Task 4: Fix async `headers()` in auth helper

**Files:**
- Modify: `lib/auth.ts`

- [ ] **Step 1: Read current implementation**

```bash
cat /Users/DIALLO9194/Downloads/keza/lib/auth.ts
```

- [ ] **Step 2: Check if `headers()` is called synchronously**

If `hasCronSecret` calls `headers()` without `await`, update it:

**Before:**
```typescript
import { headers } from "next/headers";

export function hasCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // ... checks req headers directly
}
```

If it already reads from `NextRequest` directly (not from `next/headers`), no change needed. If it uses `headers()` from `next/headers`:

**After:**
```typescript
import { headers } from "next/headers";

export async function hasCronSecret(req: NextRequest): Promise<boolean> {
  const h = await headers();
  const secret = process.env.CRON_SECRET;
  // ... use h.get("authorization") instead of headers().get(...)
}
```

And update all callers (the 7 cron routes) to `await hasCronSecret(req)`.

- [ ] **Step 3: Run type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: clean.

- [ ] **Step 4: Run full test suite**

```bash
npx jest --passWithNoTests
```

Expected: 360 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/auth.ts app/api/cron
git commit -m "fix: await headers() in auth helper for Next.js 15"
```

---

## Task 5: Verify `next.config.mjs` compatibility

**Files:**
- Modify: `next.config.mjs` (if needed)

- [ ] **Step 1: Check for deprecated config options**

```bash
npx next info 2>&1
```

In Next.js 15, `experimental.appDir` was removed (it's stable now). Check `next.config.mjs` for any deprecated keys.

- [ ] **Step 2: Remove deprecated options**

If `experimental.appDir: true` is present, remove it. If `swcMinify: true` is present (it's the default in Next.js 15), remove it.

- [ ] **Step 3: Build test**

```bash
npx next build 2>&1 | tail -20
```

Expected: successful build, no deprecation warnings.

- [ ] **Step 4: Commit if changes were made**

```bash
git add next.config.mjs
git commit -m "chore: remove deprecated Next.js 15 config options"
```

---

## Task 6: Staging deploy and smoke test

**Files:** None (Vercel deployment)

- [ ] **Step 1: Push branch to Vercel preview**

```bash
git push origin main
```

Wait for Vercel preview deployment to complete.

- [ ] **Step 2: Smoke test critical routes**

Manually verify in the Vercel preview URL:
- `/` — home page loads, search form works
- `/flights/CDG-NRT` — dynamic route resolves, SEO metadata correct
- `/destinations/DKR` — destination page loads
- `/api/icons/192` — returns PNG icon
- `/api/search` — returns results (needs valid env vars)
- `/api/cron/alerts` — returns 401 (no cron secret)

- [ ] **Step 3: Check for runtime errors in Vercel logs**

Look for any `TypeError: Cannot read properties of Promise` — these indicate missed `await params` callsites.

- [ ] **Step 4: If all green, tag the release**

```bash
git tag v15-migration-complete
git push origin --tags
```

---

## Rollback Plan

If migration causes production issues:

```bash
# Revert to Next.js 14
npm install next@14.2.35 react@18 react-dom@18 @types/react@18 @types/react-dom@18
git add package.json package-lock.json
git commit -m "revert: roll back to Next.js 14.2.35"
git push origin main
```

---

## User Actions Required

Before starting this migration:

1. **Set `CRON_SECRET` in Vercel** if not already set — cron auth relies on it
2. **Verify `@sentry/nextjs` version** — must be `>=8.0` for React 19 support. Check `npm ls @sentry/nextjs`
3. **Run on a worktree/branch** — do not migrate directly on `main` until all tasks pass

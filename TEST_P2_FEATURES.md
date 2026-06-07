# P2 Features Verification Guide

## Task P2-1: Client-Side Sentry Integration

**Status:** ✅ Implemented

**Changes:**
- Created `sentry.client.config.ts` with proper client-side configuration
  - Session replay sampling: 5% of sessions
  - On-error replay sampling: 100% when error occurs
  - Transaction tracing: 10%
  - Only enabled in production

**Testing:**
1. In development/test mode, Sentry is disabled (safe)
2. Built successfully with no TypeScript or lint errors
3. Endpoint `/api/test-error` created to trigger errors for testing in production

**Verification:**
```bash
# Build check (passes)
npm run build

# Check client config exists
ls -la sentry.client.config.ts

# Verify it's imported via next.config.mjs (already using withSentryConfig)
grep "withSentryConfig" next.config.mjs
```

---

## Task P2-2: Feature Flag for Trial Reminder Timing

**Status:** ✅ Implemented

**Changes:**
- Updated `lib/lemonsqueezy.ts` - `needsTrialReminder()` now reads configurable delay from Redis
  - Default: 1 day before trial expiry
  - Configurable via Redis key: `keza:config:trial_reminder_days_before_expiry`

- Created `app/api/admin/config/trial-reminder-days/route.ts`
  - GET: Retrieve current reminder timing
  - POST: Update reminder timing (1-30 days)
  - Requires ADMIN_SECRET header

**Testing:**
```bash
# Get current config (requires ADMIN_SECRET)
curl -X GET http://localhost:3000/api/admin/config/trial-reminder-days \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"

# Set reminder to 3 days before expiry
curl -X POST http://localhost:3000/api/admin/config/trial-reminder-days \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"days": 3}'

# Verify needsTrialReminder() respects new value
# Function will now read the new timing from Redis
```

**Verification:**
```bash
# Check endpoint exists and is properly typed
ls -la app/api/admin/config/trial-reminder-days/route.ts

# Verify TypeScript (passes)
npm run build

# Verify tests (614 tests passing)
npm test
```

---

## Task P2-3: Complete Pro Page (/app/pro/page.tsx)

**Status:** ✅ Implemented

**Changes:**

### Page Server Component (`app/pro/page.tsx`)
- Now fetches user session and Pro access status
- Passes authentication state and trial info to client

### Client Component (`app/pro/ProClient.tsx`)
- Features grid (4 features with icons)
- Pricing section ($9/month)
- Features comparison table (Free vs Pro)
- Complete FAQ with 5 questions
  - "Combien coûte KEZA Pro ?"
  - "Puis-je annuler mon abonnement ?"
  - "Qu'est-ce qui inclus dans Pro ?"
  - "Comment fonctionne l'essai gratuit ?"
  - "Est-ce que mes données sont sûres ?"
- Trial/Pro status display for logged-in users
- Sign-in redirect for non-authenticated users
- Checkout flow integration

### API Updates
- `/api/pro/checkout` - Fixed response to use `url` field consistently

**Verification:**
```bash
# Build check (passes)
npm run build

# Test check (614 tests passing)
npm test

# Check files exist and are properly structured
ls -la app/pro/page.tsx
ls -la app/pro/ProClient.tsx

# Verify no TypeScript errors
npm run tsc
```

---

## Summary of Changes

| File | Change | Type |
|------|--------|------|
| `sentry.client.config.ts` | NEW | Client-side Sentry config |
| `lib/lemonsqueezy.ts` | MODIFIED | Add dynamic reminder timing |
| `app/api/admin/config/trial-reminder-days/route.ts` | NEW | Admin config endpoint |
| `app/api/test-error/route.ts` | NEW | Error testing endpoint |
| `app/pro/page.tsx` | MODIFIED | Add auth & Pro status |
| `app/pro/ProClient.tsx` | MODIFIED | Complete UI + features |
| `app/api/pro/checkout/route.ts` | MODIFIED | Fix response field |

---

## Test Results

- **TypeScript:** ✅ All checks pass
- **ESLint:** ✅ All rules pass
- **Jest:** ✅ 614 tests pass
- **Build:** ✅ Full Next.js build succeeds

---

## Deployment Notes

1. **Sentry Client Config**
   - Automatically loaded via `next.config.mjs` (withSentryConfig)
   - Only active in production (disabled in dev)
   - Set `NEXT_PUBLIC_SENTRY_DSN` in production env vars

2. **Feature Flag**
   - Default value: 1 day before expiry
   - Can be changed at runtime via admin endpoint
   - Changes are immediate (no cache)

3. **Pro Page**
   - Shows different UI for logged-in vs anonymous users
   - Trial status shows days remaining
   - Checkout link redirects non-authenticated users to sign-in

All three P2 features are production-ready and can be deployed immediately.

# KEZA P1 Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 6 P1 quality/UX bugs from Perplexity audit: header overflow, light mode contrast, alert messaging, valuation differences, portfolio input focus, share button feedback.

**Architecture:** 
Fix 6 independent UI/UX bugs across different pages. Each task is isolated (no cross-dependencies). Use TDD for logic changes, CSS fixes for styling, toast notification library for feedback.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, react-hot-toast (if not already used), Jest for tests

---

## Task 1: Fix Header Overflow on Narrow Viewports (B5)

**Files:**
- Modify: `components/Header.tsx` (navigation responsive design)
- Modify: `styles/globals.css` or Tailwind config (breakpoints)
- Test: `__tests__/components/Header.test.tsx`

### Problem
Header shows truncated text on 1024px viewport. "Prices" becomes "'rices" due to overflow.

### Solution
Make navigation responsive: use hamburger menu on mobile/tablet, stack items on narrow screens, or use abbreviated labels.

- [ ] **Step 1: Read Header.tsx and understand current structure**

Read: `components/Header.tsx` completely
- Note: nav items, their labels, current classes
- Check: media queries if any exist
- Identify: which element truncates ("Prices" is in which nav item?)

- [ ] **Step 2: Write test for responsive behavior**

File: `__tests__/components/Header.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import { Header } from '@/components/Header';

describe('Header responsive', () => {
  it('does not truncate text on 1024px viewport', () => {
    // Mock window.innerWidth = 1024
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    render(<Header lang="en" />);
    
    const pricesLink = screen.getByText(/Prices|Prix/i);
    expect(pricesLink).toBeInTheDocument();
    expect(pricesLink).not.toHaveTextContent("'rices"); // should NOT be truncated
  });

  it('displays hamburger menu on mobile', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    render(<Header lang="en" />);
    
    const hamburger = screen.queryByRole('button', { name: /menu/i });
    expect(hamburger).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest __tests__/components/Header.test.tsx -v
```

Expected: FAIL (text is truncated on 1024px)

- [ ] **Step 4: Implement responsive header**

Modify: `components/Header.tsx`

Add responsive classes to nav container. Example approach (adjust based on current structure):

```typescript
// Current nav structure (example)
<nav className="flex gap-4 items-center">
  <Link href="/programmes">Programmes</Link>
  <Link href="/comparer">Comparer</Link>
  <Link href="/prices">Prices</Link>
  {/* etc */}
</nav>

// Fix: make responsive
<nav className="hidden md:flex gap-4 items-center">
  {/* Desktop nav items */}
</nav>

<button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
  {/* Hamburger icon */}
  <span className="block">☰</span>
</button>

{/* Mobile menu (below button) */}
{mobileMenuOpen && (
  <nav className="md:hidden flex flex-col gap-2 mt-2">
    {/* Same links, vertical layout */}
  </nav>
)}
```

Or use abbreviated labels on smaller screens:

```typescript
<span className="hidden md:inline">Prices</span>
<span className="md:hidden">₹</span> {/* icon instead of text */}
```

Choose approach that matches KEZA's design language.

- [ ] **Step 5: Run test again to confirm it passes**

```bash
npx jest __tests__/components/Header.test.tsx -v
```

Expected: PASS

- [ ] **Step 6: Verify responsive behavior manually**

```bash
npm run dev
```

Go to http://localhost:3000/programmes
- Open browser dev tools (F12)
- Set viewport to 1024px (use device toolbar)
- VERIFY: No truncated text, header fully readable
- VERIFY: Hamburger menu visible on narrower widths (if that's the approach)

- [ ] **Step 7: Commit**

```bash
git add components/Header.tsx __tests__/components/Header.test.tsx
git commit -m "fix: make header navigation responsive on narrow viewports

- Fixed header text truncation on 1024px viewport
- Added responsive breakpoints for mobile/tablet/desktop
- Hamburger menu appears on screens < 768px
- All nav labels fully visible and readable

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Fix Light Mode Contrast on Deal Banner (B6)

**Files:**
- Modify: Component displaying deals (likely in `/deals` page or `components/DealCard.tsx`)
- Modify: Tailwind classes or CSS for light mode
- Test: `__tests__/components/DealCard.test.tsx` or similar

### Problem
Light mode shows beige text on beige background (insufficient contrast). WCAG AA requires 4.5:1.

### Solution
Ensure text color has sufficient contrast. Use Tailwind's `dark:` variants or add explicit light-mode colors.

- [ ] **Step 1: Identify the component and current colors**

Search for the deal banner component:
```bash
grep -r "deal" components/ --include="*.tsx" | grep -i banner
```

Find the component that displays the main deal. Check its current color classes.

Example: if it uses `bg-gray-100 text-gray-200`, that's insufficient contrast.

- [ ] **Step 2: Write test for contrast**

File: `__tests__/components/DealCard.test.tsx`

```typescript
import { render } from '@testing-library/react';
import { DealBanner } from '@/components/DealBanner'; // adjust import

describe('DealBanner contrast', () => {
  it('has sufficient contrast in light mode', () => {
    const { container } = render(<DealBanner deal={mockDeal} />);
    
    const banner = container.querySelector('[data-testid="deal-banner"]');
    
    // This is a visual check, but we can verify classes are present
    expect(banner).toHaveClass('dark:text-white'); // light mode should have strong color
    expect(banner).not.toHaveClass('text-gray-400'); // should NOT be light gray
  });
});
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
npx jest __tests__/components/DealCard.test.tsx -v
```

- [ ] **Step 4: Fix colors for light mode**

Modify the deal banner component. Change text color to be darker in light mode:

```typescript
// BEFORE (insufficient contrast)
<div className="bg-gray-100 text-gray-400">
  {/* content */}
</div>

// AFTER (good contrast)
<div className="bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
  {/* content */}
</div>
```

Or if it's a specific background color, adjust text to match:
```typescript
<div className="bg-amber-50 text-gray-900"> {/* was: text-amber-200 */}
  {/* content */}
</div>
```

- [ ] **Step 5: Run test again**

```bash
npx jest __tests__/components/DealCard.test.tsx -v
```

Expected: PASS

- [ ] **Step 6: Verify manually**

```bash
npm run dev
```

1. Go to /deals
2. Toggle light mode (or set system to light mode)
3. Look at deal banner
4. VERIFY: Text is clearly readable (no beige-on-beige)
5. Test with accessibility tool if available: https://www.webim.com/resources/contrast-checker/

- [ ] **Step 7: Commit**

```bash
git add components/DealBanner.tsx __tests__/components/DealCard.test.tsx
git commit -m "fix: ensure deal banner has sufficient contrast in light mode

- Changed deal banner text color to dark gray (from light)
- Now meets WCAG AA standard (4.5:1 contrast ratio)
- Readable in both light and dark modes

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Fix Alert Confirmation Message Ambiguity (B7)

**Files:**
- Modify: `/app/alertes/page.tsx` or `components/AlertForm.tsx`
- Modify: `components/AlertFormSubmit.tsx` or similar
- Test: `__tests__/app/alertes/page.test.tsx`

### Problem
Message says "si des alertes existent" (if alerts exist) which is confusing. Should be clear:
- If no alerts exist: "No alerts found. Create one from search results."
- If alert was just created: "Alert created! Check your email."

### Solution
Add conditional messaging based on form state (submission success, existing alerts).

- [ ] **Step 1: Read the alert form code**

Read: `/app/alertes/page.tsx` and any alert-related components
- Note: current message text
- Identify: form submission handler
- Check: where success/error state is tracked

- [ ] **Step 2: Write test for clear messaging**

File: `__tests__/app/alertes/page.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import AlertsPage from '@/app/alertes/page';
import { useSession } from 'next-auth/react';

jest.mock('next-auth/react');

describe('/alertes page messaging', () => {
  it('shows helpful message when no alerts exist', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { email: 'test@example.com' } },
    });

    render(<AlertsPage />);
    
    const message = screen.getByText(/create.*search/i);
    expect(message).toBeInTheDocument();
    expect(message).not.toContain('if alerts exist'); // should NOT have ambiguous wording
  });

  it('shows confirmation after creating alert', async () => {
    render(<AlertsPage />);
    
    const form = screen.getByRole('form', { name: /create alert/i });
    fireEvent.submit(form);
    
    // After successful submission
    const confirmation = await screen.findByText(/alert.*created|check.*email/i);
    expect(confirmation).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
npx jest __tests__/app/alertes/page.test.tsx -v
```

- [ ] **Step 4: Implement clear messaging**

Modify: Alert form component

```typescript
// Current (ambiguous)
<p>Si des alertes existent</p>

// Fixed (clear)
const [alertsExist, setAlertsExist] = useState(false);
const [justCreated, setJustCreated] = useState(false);

// In JSX:
{!alertsExist && !justCreated && (
  <p className="text-blue-600">
    Aucune alerte trouvée. Crée ta première alerte depuis les résultats de recherche.
  </p>
)}

{justCreated && (
  <p className="text-green-600">
    Alerte créée! Vérifie ta boîte email.
  </p>
)}

{alertsExist && (
  <p>Lien envoyé, vérifie ta boîte mail</p>
)}
```

- [ ] **Step 5: Run test again**

```bash
npx jest __tests__/app/alertes/page.test.tsx -v
```

Expected: PASS

- [ ] **Step 6: Verify manually**

```bash
npm run dev
```

1. Go to /alertes
2. VERIFY: Clear message (not "if alerts exist")
3. Create an alert from search results (CDG → JFK)
4. VERIFY: Success message appears on /alertes page

- [ ] **Step 7: Commit**

```bash
git add app/alertes/page.tsx components/AlertForm.tsx __tests__/app/alertes/page.test.tsx
git commit -m "fix: clarify alert confirmation messaging

- Replaced ambiguous 'if alerts exist' with clear conditional messages
- 'No alerts found' when list is empty
- 'Alert created' confirmation after form submission
- Removed confusion about alert status

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Fix Valuation Differences in Comparer (B8)

**Files:**
- Modify: `/app/comparer/page.tsx` or `components/ComparisonTable.tsx`
- Test: `__tests__/app/comparer/page.test.tsx`

### Problem
All 3 destinations show identical 1.9¢/mile value. Should show different CPM based on actual data.

### Solution
Ensure Comparer uses dynamic pricing engine (like /calculateur does), not static fallback.

- [ ] **Step 1: Read Comparer component**

Read: `/app/comparer/page.tsx` completely
- Check: How valuations are calculated
- Identify: Data source (static array? API call?)
- Compare with: `/app/calculateur/page.tsx` (which works correctly)

Expected finding: Comparer uses hardcoded value instead of calling costEngine.

- [ ] **Step 2: Write test for different values**

File: `__tests__/app/comparer/page.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import ComparerPage from '@/app/comparer/page';

describe('/comparer page valuations', () => {
  it('shows different CPM values for different destinations', () => {
    render(<ComparerPage />);
    
    // Select 3 destinations
    const selects = screen.getAllByRole('combobox');
    // Fill with different routes (CDG-LAX, CDG-NRT, CDG-BKK)
    
    const values = screen.getAllByText(/(\d+\.?\d*¢)/);
    
    // Extract numeric values
    const nums = values.map(v => parseFloat(v.textContent));
    
    // Check they're NOT all the same
    const unique = new Set(nums);
    expect(unique.size).toBeGreaterThan(1); // Should have different values
    expect(nums).not.toEqual([1.9, 1.9, 1.9]); // NOT all 1.9¢
  });
});
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
npx jest __tests__/app/comparer/page.test.tsx -v
```

Expected: FAIL (all values are identical)

- [ ] **Step 4: Use dynamic pricing in Comparer**

Modify: `/app/comparer/page.tsx`

Replace static value lookup with actual costEngine call:

```typescript
// BEFORE (hardcoded)
const cpmCents = 1.9; // Always 1.9¢

// AFTER (dynamic)
import { getMilesRequired } from '@/lib/engine/awards';
import { getEffectivePrices } from '@/lib/costEngine';

async function calculateCPM(from: string, to: string, cabin: string) {
  const cashPrice = await fetchCashPrice(from, to, cabin);
  const milesRequired = getMilesRequired('AeroplanPoints', from, to, cabin);
  
  if (!cashPrice || !milesRequired) return null;
  
  const cpp = (cashPrice / milesRequired) * 100; // cents per mile
  return cpp;
}
```

- [ ] **Step 5: Run test again**

```bash
npx jest __tests__/app/comparer/page.test.tsx -v
```

Expected: PASS (values differ)

- [ ] **Step 6: Verify manually**

```bash
npm run dev
```

1. Go to /comparer
2. Select 3 different destinations (e.g., LAX, NRT, BKK all from CDG)
3. VERIFY: Values shown are DIFFERENT (not all 1.9¢)
4. Check values match /calculateur for same routes

- [ ] **Step 7: Commit**

```bash
git add app/comparer/page.tsx __tests__/app/comparer/page.test.tsx
git commit -m "fix: use dynamic pricing in comparer instead of static fallback

- Replaced hardcoded 1.9¢ with actual CPM calculation
- Now calls costEngine for per-route valuation
- Different destinations show different values
- Values now match /calculateur

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Fix Portfolio Input Focus Issue (B9)

**Files:**
- Modify: `components/PortfolioForm.tsx` or `/app/portefeuille/page.tsx`
- Test: `__tests__/components/PortfolioForm.test.tsx`

### Problem
When entering 50K Flying Blue then 30K ANA, the ANA field value doesn't save (stays at 0). Focus issue.

### Solution
Ensure input state is properly managed (useState for each field, or controlled form).

- [ ] **Step 1: Read Portfolio form code**

Read: `/app/portefeuille/page.tsx` and `components/PortfolioForm.tsx`
- Check: How input values are stored (React state? form refs?)
- Identify: onChange handlers
- Look for: If state is getting reset inappropriately

Expected finding: ANA field loses focus before value is committed to state.

- [ ] **Step 2: Write test for input persistence**

File: `__tests__/components/PortfolioForm.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PortfolioForm from '@/components/PortfolioForm';
import userEvent from '@testing-library/user-event';

describe('PortfolioForm input handling', () => {
  it('saves both Flying Blue and ANA values', async () => {
    const user = userEvent.setup();
    render(<PortfolioForm />);
    
    const fbInput = screen.getByLabelText(/Flying Blue/i);
    const anaInput = screen.getByLabelText(/ANA/i);
    
    // Type in Flying Blue
    await user.type(fbInput, '50000');
    expect(fbInput).toHaveValue('50000');
    
    // Type in ANA
    await user.type(anaInput, '30000');
    expect(anaInput).toHaveValue('30000');
    
    // Verify both values are saved (not lost)
    await waitFor(() => {
      expect(fbInput).toHaveValue('50000');
      expect(anaInput).toHaveValue('30000'); // Should NOT be 0
    });
  });
});
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
npx jest __tests__/components/PortfolioForm.test.tsx -v
```

Expected: FAIL (ANA value becomes 0)

- [ ] **Step 4: Fix input state management**

Modify: `components/PortfolioForm.tsx`

Ensure each input is a controlled component with proper onChange:

```typescript
// BEFORE (uncontrolled)
<input type="number" name="ana" />

// AFTER (controlled)
const [portfolio, setPortfolio] = useState({
  flyingBlue: 0,
  ana: 0,
  // ... other programs
});

const handleChange = (program: string, value: string) => {
  setPortfolio(prev => ({
    ...prev,
    [program]: parseInt(value) || 0
  }));
};

// In JSX:
<input
  type="number"
  value={portfolio.ana}
  onChange={(e) => handleChange('ana', e.target.value)}
/>
```

Or use form library (react-hook-form) if that's KEZA's pattern.

- [ ] **Step 5: Run test again**

```bash
npx jest __tests__/components/PortfolioForm.test.tsx -v
```

Expected: PASS

- [ ] **Step 6: Verify manually**

```bash
npm run dev
```

1. Go to /portefeuille
2. Enter 50,000 in Flying Blue field
3. Enter 30,000 in ANA field
4. VERIFY: Both values stay (don't reset to 0)
5. Total value updates correctly

- [ ] **Step 7: Commit**

```bash
git add components/PortfolioForm.tsx __tests__/components/PortfolioForm.test.tsx
git commit -m "fix: ensure portfolio input values persist correctly

- Changed to controlled inputs with proper state management
- Flying Blue and ANA values both save and persist
- Total portfolio calculation includes both values
- Fixed focus loss issue on multi-field forms

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Add Toast Feedback for Share Button (B10)

**Files:**
- Modify: Component with share button (likely in `/deals` page or `components/DealCard.tsx`)
- Modify: Install/configure toast library if needed (react-hot-toast)
- Test: `__tests__/components/DealCard.test.tsx` or similar

### Problem
Clicking Share button provides no feedback. User doesn't know if URL was copied.

### Solution
Show toast notification when URL is copied.

- [ ] **Step 1: Check if toast library is already used**

```bash
grep -r "toast\|Toast\|notification" app/ components/ --include="*.tsx" | head -20
```

If react-hot-toast or similar is already used, skip library install. Otherwise:

```bash
npm install react-hot-toast
```

- [ ] **Step 2: Read the share button component**

Find the share button implementation:
```bash
grep -r "share\|Share" components/ --include="*.tsx" | grep -i button
```

Read that component completely. Identify:
- onClick handler
- URL being copied (if any)
- Current feedback mechanism

- [ ] **Step 3: Write test for toast notification**

File: `__tests__/components/DealCard.test.tsx` (update if exists)

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import DealCard from '@/components/DealCard';
import { Toaster } from 'react-hot-toast';

describe('DealCard share button', () => {
  it('shows toast notification when share is clicked', () => {
    render(
      <>
        <Toaster />
        <DealCard deal={mockDeal} />
      </>
    );
    
    const shareButton = screen.getByRole('button', { name: /share/i });
    fireEvent.click(shareButton);
    
    // Toast should appear
    const toast = screen.getByText(/copied|shared|link/i);
    expect(toast).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run test to confirm it fails**

```bash
npx jest __tests__/components/DealCard.test.tsx -v
```

Expected: FAIL (no toast appears)

- [ ] **Step 5: Implement toast notification**

Modify: Deal card / share button component

```typescript
import toast from 'react-hot-toast';

// In share button onClick:
const handleShare = () => {
  const url = `${window.location.origin}/deals/${deal.id}`;
  
  // Copy to clipboard
  navigator.clipboard.writeText(url).then(() => {
    // Show success toast
    toast.success('URL copied! Ready to share.');
  }).catch(() => {
    // Show error toast if copy fails
    toast.error('Failed to copy URL');
  });
};

// In JSX:
<button onClick={handleShare}>
  Share
</button>
```

Also ensure Toaster is rendered in root layout:

Modify: `app/layout.tsx`

```typescript
import { Toaster } from 'react-hot-toast';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Run test again**

```bash
npx jest __tests__/components/DealCard.test.tsx -v
```

Expected: PASS

- [ ] **Step 7: Verify manually**

```bash
npm run dev
```

1. Go to /deals
2. Click Share button on any deal
3. VERIFY: Toast notification appears (bottom right)
4. VERIFY: Toast says "URL copied" or similar
5. Paste (Ctrl+V) somewhere to verify URL was actually copied

- [ ] **Step 8: Commit**

```bash
git add components/DealCard.tsx app/layout.tsx __tests__/components/DealCard.test.tsx
git commit -m "feat: add toast notification for share button

- Share button now shows toast 'URL copied!' confirmation
- Uses react-hot-toast for notifications
- User gets immediate feedback when sharing deal
- Toast appears for 3 seconds, disappears automatically

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Deploy & Verify All Fixes

**Files:**
- No new files
- Reference: Regression test suite

- [ ] **Step 1: Run full regression tests**

```bash
cd /Users/DIALLO9194/Downloads/keza
npm test -- --passWithNoTests
```

Expected: All tests pass (438+)

- [ ] **Step 2: TypeScript & ESLint check**

```bash
npx tsc --noEmit
npx eslint .
```

Expected: No errors

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 4: Push all 6 commits to main**

```bash
git push origin main
```

Expected: All commits push successfully

- [ ] **Step 5: Monitor Vercel deployment**

Go to https://vercel.com/dashboard, watch deployment complete (3-5 min)

- [ ] **Step 6: Verify production SHA**

```bash
curl https://keza-taupe.vercel.app/api/version
```

Compare SHA with latest commit

- [ ] **Step 7: Quick smoke test in production**

- Go to https://keza-taupe.vercel.app/programmes → test header on 1024px (B5)
- Go to /deals in light mode → check contrast (B6)
- Go to /alertes → check messaging (B7)
- Go to /comparer → check different values (B8)
- Go to /portefeuille → test input (B9)
- Go to /deals → click Share, check toast (B10)

All should work! ✅

---

## Task 8: Final Comprehensive Audit

**Files:**
- No new files
- Manual testing in production

Run a final 360° audit like Perplexity:
- Test all 6 P1 bugs are FIXED
- Verify all 4 P0 bugs STILL WORK (no regressions)
- Check all 15 pages load correctly
- Verify responsiveness
- Check performance

Report: "✅ All 6 P1 bugs fixed + all 4 P0 bugs still working + zero regressions"

---

## Summary

**6 P1 Fixes:**
1. ✅ Header overflow (responsive)
2. ✅ Light mode contrast (WCAG AA)
3. ✅ Alert messaging (clear)
4. ✅ Valuations (different CPMs)
5. ✅ Portfolio focus (inputs persist)
6. ✅ Share toast (feedback)

**Then:**
- Deploy all 6 fixes
- Run regression tests (438+ passing)
- Verify all P0s still work
- Final 360° audit

---

Plan complete and saved to `docs/superpowers/plans/2026-06-06-keza-p1-fixes.md`.

**Ready to execute with Subagent-Driven Development?** (recommended for quality reviews between each task)

Or prefer Inline Execution in this session?
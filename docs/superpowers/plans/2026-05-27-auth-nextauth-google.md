# Auth — NextAuth Google OAuth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional Google OAuth accounts so users can sync their miles wallet, search history and favorites across devices — without breaking anything for anonymous users.

**Architecture:** NextAuth v4 (stable) with JWT session strategy (no adapter — sessions live in httpOnly cookies). User profile data is stored in Redis under `keza:profile:server:{email}`. The localStorage profile remains the source of truth for anonymous users; when logged in, the app reads from Redis and offers a one-click sync. Auth is purely additive — every existing feature keeps working without a login.

**Tech Stack:** `next-auth@^4`, Google OAuth 2.0, Upstash Redis (already installed), JWT httpOnly cookies, Next.js 15 App Router.

---

## Critical constraints

- **Never import `lib/auth.ts` in a client component** — it references `server-only` transitively. Use `next-auth/react` (`useSession`, `signIn`, `signOut`) on the client.
- **Anonymous users are unchanged** — every page, hook and API route must keep working without a session.
- **Engine routes untouched** — `/api/search`, `/api/search/stream`, `/api/alerts`, `/api/calendar`, `/api/trending` are not modified.
- **438 tests must stay green** — add mocks for `next-auth/react` in components tests.

---

## File map

| File | Action | Purpose |
|------|--------|---------|
| `lib/auth.ts` | CREATE | NextAuth config — providers, callbacks, session shape |
| `app/api/auth/[...nextauth]/route.ts` | CREATE | NextAuth handler |
| `lib/serverProfile.ts` | CREATE | Redis read/write for server-side profile |
| `app/api/profile/route.ts` | CREATE | GET + PATCH server profile (session-protected) |
| `components/AuthButton.tsx` | CREATE | Login/logout button, avatar pill |
| `contexts/SessionContext.tsx` | CREATE | `SessionProvider` wrapper for client tree |
| `hooks/useAuth.ts` | CREATE | `useAuth()` → `{ user, isLoggedIn, isLoading }` |
| `app/compte/page.tsx` | CREATE | Account management page |
| `app/compte/CompteClient.tsx` | CREATE | Account UI — email, subscription, sync, logout |
| `components/Header.tsx` | MODIFY | Add `AuthButton` next to profile icon |
| `app/layout.tsx` | MODIFY | Wrap children in `SessionProvider` |
| `.env.example` | MODIFY | Add `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| `__tests__/lib/serverProfile.test.ts` | CREATE | Unit tests for Redis profile helpers |
| `__tests__/api/profile.test.ts` | CREATE | API route tests |
| `__tests__/components/AuthButton.test.tsx` | CREATE | Component test |

---

## Task 1: Install next-auth and create the auth config

**Files:**
- Create: `lib/auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Modify: `.env.example`

- [ ] **Step 1: Install next-auth**

```bash
cd /Users/DIALLO9194/Downloads/keza
npm install next-auth@^4
```

Expected: `next-auth` appears in `package.json` dependencies.

- [ ] **Step 2: Create `lib/auth.ts`**

```ts
// lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID     ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge:   30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    // Persist email in the JWT so we can use it server-side
    async jwt({ token, user }) {
      if (user?.email) token.email = user.email;
      return token;
    },
    // Expose email in the session object visible to useSession()
    async session({ session, token }) {
      if (token.email && session.user) {
        session.user.email = token.email as string;
      }
      return session;
    },
  },

  pages: {
    signIn:  "/connexion",   // custom sign-in page (created in Task 3)
    error:   "/connexion",   // auth errors redirect there too
  },

  secret: process.env.NEXTAUTH_SECRET,
};
```

- [ ] **Step 3: Create `app/api/auth/[...nextauth]/route.ts`**

```ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

- [ ] **Step 4: Add env vars to `.env.example`**

Append after the existing LEMONSQUEEZY block:

```
# ── NextAuth ─────────────────────────────────────────────────────────────────
# Generate: openssl rand -hex 32
NEXTAUTH_SECRET=generate_with_openssl_rand_hex_32
NEXTAUTH_URL=https://keza-taupe.vercel.app

# Google OAuth — https://console.cloud.google.com → Credentials → OAuth 2.0
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

- [ ] **Step 5: Verify TS compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(auth): install next-auth, Google provider config, API route"
```

---

## Task 2: Server-side profile helpers (Redis)

**Files:**
- Create: `lib/serverProfile.ts`
- Create: `__tests__/lib/serverProfile.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/lib/serverProfile.test.ts
const mockGet  = jest.fn();
const mockSet  = jest.fn();
const mockDel  = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: { get: mockGet, set: mockSet, del: mockDel },
}));

import { getServerProfile, saveServerProfile, deleteServerProfile } from "@/lib/serverProfile";
import type { UserProfile } from "@/lib/userProfile";

const EMAIL = "user@example.com";
const PROFILE: Partial<UserProfile> = {
  balances: { "Flying Blue": 45000 },
  favoriteRoutes: [{ from: "DSS", to: "CDG", addedAt: "2026-01-01T00:00:00Z" }],
};

describe("getServerProfile", () => {
  it("returns null when key missing", async () => {
    mockGet.mockResolvedValueOnce(null);
    expect(await getServerProfile(EMAIL)).toBeNull();
    expect(mockGet).toHaveBeenCalledWith("keza:profile:server:user@example.com");
  });

  it("returns parsed profile when key exists", async () => {
    mockGet.mockResolvedValueOnce(PROFILE);
    const result = await getServerProfile(EMAIL);
    expect(result?.balances).toEqual({ "Flying Blue": 45000 });
  });
});

describe("saveServerProfile", () => {
  it("writes to correct key with 90-day TTL", async () => {
    mockSet.mockResolvedValueOnce("OK");
    await saveServerProfile(EMAIL, PROFILE as UserProfile);
    expect(mockSet).toHaveBeenCalledWith(
      "keza:profile:server:user@example.com",
      PROFILE,
      { ex: 90 * 24 * 60 * 60 }
    );
  });
});

describe("deleteServerProfile", () => {
  it("deletes the key", async () => {
    mockDel.mockResolvedValueOnce(1);
    await deleteServerProfile(EMAIL);
    expect(mockDel).toHaveBeenCalledWith("keza:profile:server:user@example.com");
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx jest __tests__/lib/serverProfile.test.ts 2>&1 | tail -10
```

Expected: `Cannot find module '@/lib/serverProfile'`

- [ ] **Step 3: Create `lib/serverProfile.ts`**

```ts
// lib/serverProfile.ts
import "server-only";
import { redis } from "@/lib/redis";
import type { UserProfile } from "@/lib/userProfile";

const profileKey = (email: string) =>
  `keza:profile:server:${email.toLowerCase().trim()}`;

const TTL = 90 * 24 * 60 * 60; // 90 days

export async function getServerProfile(email: string): Promise<UserProfile | null> {
  try {
    return await redis.get<UserProfile>(profileKey(email));
  } catch {
    return null;
  }
}

export async function saveServerProfile(
  email: string,
  profile: UserProfile
): Promise<void> {
  try {
    await redis.set(profileKey(email), profile, { ex: TTL });
  } catch {
    // fail silently — localStorage is the fallback
  }
}

export async function deleteServerProfile(email: string): Promise<void> {
  try {
    await redis.del(profileKey(email));
  } catch { /* ignore */ }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx jest __tests__/lib/serverProfile.test.ts 2>&1 | tail -10
```

Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): server-side profile helpers in Redis + tests"
```

---

## Task 3: Profile API route (GET + PATCH)

**Files:**
- Create: `app/api/profile/route.ts`
- Create: `__tests__/api/profile.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/api/profile.test.ts
import { NextRequest } from "next/server";

const mockGetServerSession = jest.fn();
jest.mock("next-auth/next", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

const mockGetProfile  = jest.fn();
const mockSaveProfile = jest.fn();
jest.mock("@/lib/serverProfile", () => ({
  getServerProfile:    (...args: unknown[]) => mockGetProfile(...args),
  saveServerProfile:   (...args: unknown[]) => mockSaveProfile(...args),
}));

jest.mock("@/lib/auth", () => ({ authOptions: {} }));

import { GET, PATCH } from "@/app/api/profile/route";

function makeReq(method: string, body?: unknown) {
  return new NextRequest("http://localhost/api/profile", {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { "Content-Type": "application/json" },
  });
}

describe("GET /api/profile", () => {
  it("returns 401 when no session", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(401);
  });

  it("returns profile when session exists", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { email: "a@b.com" } });
    mockGetProfile.mockResolvedValueOnce({ balances: { "Flying Blue": 50000 } });
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.profile.balances["Flying Blue"]).toBe(50000);
  });

  it("returns null profile when key missing", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { email: "new@b.com" } });
    mockGetProfile.mockResolvedValueOnce(null);
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.profile).toBeNull();
  });
});

describe("PATCH /api/profile", () => {
  it("returns 401 when no session", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await PATCH(makeReq("PATCH", { balances: {} }));
    expect(res.status).toBe(401);
  });

  it("saves profile and returns 200", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { email: "a@b.com" } });
    mockSaveProfile.mockResolvedValueOnce(undefined);
    const res = await PATCH(makeReq("PATCH", { balances: { "Flying Blue": 60000 } }));
    expect(res.status).toBe(200);
    expect(mockSaveProfile).toHaveBeenCalledWith("a@b.com", expect.objectContaining({ balances: { "Flying Blue": 60000 } }));
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx jest __tests__/api/profile.test.ts 2>&1 | tail -10
```

Expected: `Cannot find module '@/app/api/profile/route'`

- [ ] **Step 3: Create `app/api/profile/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getServerProfile, saveServerProfile } from "@/lib/serverProfile";
import type { UserProfile } from "@/lib/userProfile";
import { rateLimitResponse } from "@/lib/ratelimit";

export async function GET(req: NextRequest) {
  const limited = await rateLimitResponse(req, { namespace: "api:profile:get", limit: 60, windowSeconds: 60 });
  if (limited) return limited;

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getServerProfile(session.user.email);
  return NextResponse.json({ profile });
}

export async function PATCH(req: NextRequest) {
  const limited = await rateLimitResponse(req, { namespace: "api:profile:patch", limit: 30, windowSeconds: 60 });
  if (limited) return limited;

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Partial<UserProfile>;
  try {
    body = await req.json() as Partial<UserProfile>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  await saveServerProfile(session.user.email, body as UserProfile);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx jest __tests__/api/profile.test.ts 2>&1 | tail -10
```

Expected: `5 passed`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): GET + PATCH /api/profile — session-protected server profile"
```

---

## Task 4: SessionProvider + useAuth hook

**Files:**
- Create: `contexts/SessionContext.tsx`
- Create: `hooks/useAuth.ts`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create `contexts/SessionContext.tsx`**

```tsx
// contexts/SessionContext.tsx
"use client";

import { SessionProvider } from "next-auth/react";

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

- [ ] **Step 2: Create `hooks/useAuth.ts`**

```ts
// hooks/useAuth.ts
"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export interface AuthUser {
  email: string;
  name:  string | null;
  image: string | null;
}

export interface UseAuthReturn {
  user:       AuthUser | null;
  isLoggedIn: boolean;
  isLoading:  boolean;
  login:      () => void;
  logout:     () => void;
}

export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession();

  const user: AuthUser | null = session?.user?.email
    ? {
        email: session.user.email,
        name:  session.user.name  ?? null,
        image: session.user.image ?? null,
      }
    : null;

  return {
    user,
    isLoggedIn: !!user,
    isLoading:  status === "loading",
    login:  () => signIn("google"),
    logout: () => signOut({ callbackUrl: "/" }),
  };
}
```

- [ ] **Step 3: Wrap root layout in `AuthSessionProvider`**

In `app/layout.tsx`, add the import and wrap the existing `<ProfileProvider>`:

```tsx
// Add import at top:
import { AuthSessionProvider } from "@/contexts/SessionContext";

// In the JSX, wrap ProfileProvider:
<AuthSessionProvider>
  <ProfileProvider>
    {children}
  </ProfileProvider>
</AuthSessionProvider>
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): SessionProvider, useAuth hook, wrap root layout"
```

---

## Task 5: AuthButton component + Header integration

**Files:**
- Create: `components/AuthButton.tsx`
- Create: `__tests__/components/AuthButton.test.tsx`
- Modify: `components/Header.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/components/AuthButton.test.tsx
import { render, screen } from "@testing-library/react";

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

import { AuthButton } from "@/components/AuthButton";

describe("AuthButton", () => {
  it("shows login button when not authenticated", () => {
    render(<AuthButton lang="fr" />);
    expect(screen.getByRole("button", { name: /connexion/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx jest __tests__/components/AuthButton.test.tsx 2>&1 | tail -10
```

Expected: `Cannot find module '@/components/AuthButton'`

- [ ] **Step 3: Create `components/AuthButton.tsx`**

```tsx
"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";

interface Props {
  lang: "fr" | "en";
}

export function AuthButton({ lang }: Props) {
  const { data: session, status } = useSession();
  const fr = lang === "fr";

  if (status === "loading") {
    return <div className="w-8 h-8 rounded-full bg-surface-2 animate-pulse" />;
  }

  if (session?.user) {
    return (
      <div className="relative group">
        <button
          className="flex items-center gap-1.5 rounded-full border border-border bg-surface-2 hover:border-primary/40 transition-all overflow-hidden"
          aria-label={fr ? "Mon compte" : "My account"}
        >
          {session.user.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name ?? "avatar"}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              {(session.user.name ?? session.user.email ?? "?")[0]?.toUpperCase()}
            </div>
          )}
        </button>

        {/* Dropdown */}
        <div className="absolute right-0 top-10 z-50 hidden group-focus-within:flex flex-col bg-surface border border-border rounded-xl shadow-lg overflow-hidden min-w-[160px]">
          <a
            href="/compte"
            className="px-4 py-2.5 text-xs text-fg hover:bg-surface-2 transition-colors"
          >
            👤 {fr ? "Mon compte" : "My account"}
          </a>
          <a
            href="/profil"
            className="px-4 py-2.5 text-xs text-fg hover:bg-surface-2 transition-colors"
          >
            💳 {fr ? "Wallet miles" : "Miles wallet"}
          </a>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="px-4 py-2.5 text-xs text-left text-muted hover:text-fg hover:bg-surface-2 transition-colors border-t border-border"
          >
            {fr ? "Se déconnecter" : "Sign out"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface-2 text-xs font-semibold text-muted hover:text-fg hover:border-primary/40 transition-all"
      aria-label={fr ? "Connexion" : "Sign in"}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z"/>
      </svg>
      {fr ? "Connexion" : "Sign in"}
    </button>
  );
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx jest __tests__/components/AuthButton.test.tsx 2>&1 | tail -10
```

Expected: `1 passed`

- [ ] **Step 5: Add `AuthButton` to `components/Header.tsx`**

Add import at top of Header:
```tsx
import { AuthButton } from "@/components/AuthButton";
```

In the right-side flex div, add `AuthButton` just before the profile icon link:
```tsx
{/* Auth — login/avatar */}
<AuthButton lang={lang} />
```

Remove the `{/* Pro upgrade CTA */}` pill added earlier if desired, or keep both. Keep it — it's passive.

- [ ] **Step 6: TypeScript + full test suite**

```bash
npx tsc --noEmit 2>&1 | head -20
npx jest --passWithNoTests 2>&1 | tail -10
```

Expected: 0 TS errors, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(auth): AuthButton component — Google login/logout in header"
```

---

## Task 6: Custom sign-in page `/connexion`

**Files:**
- Create: `app/connexion/page.tsx`

The NextAuth config points `pages.signIn` to `/connexion`. We need a page there so the redirect doesn't 404.

- [ ] **Step 1: Create `app/connexion/page.tsx`**

```tsx
import type { Metadata } from "next";
import { ConnexionClient } from "./ConnexionClient";

export const metadata: Metadata = {
  title: "Connexion — KEZA",
  robots: { index: false },
};

export default function ConnexionPage() {
  return <ConnexionClient />;
}
```

- [ ] **Step 2: Create `app/connexion/ConnexionClient.tsx`**

```tsx
"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";

export function ConnexionClient() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link href="/" className="text-2xl font-black text-primary">KEZA</Link>
          <p className="text-sm text-muted mt-2">Connecte-toi pour synchroniser ton wallet miles sur tous tes appareils.</p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6 space-y-3">
          <button
            onClick={() => signIn("google", { callbackUrl: "/profil" })}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-border bg-bg hover:bg-surface-2 transition-colors text-sm font-semibold text-fg"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z"/>
            </svg>
            Continuer avec Google
          </button>

          <p className="text-center text-[11px] text-muted">
            Tu peux aussi utiliser KEZA sans compte.{" "}
            <Link href="/" className="text-primary hover:underline">Retour à la recherche →</Link>
          </p>
        </div>

        <div className="text-center text-[11px] text-muted/60 space-y-1">
          <p>Tes données ne sont jamais partagées avec des tiers.</p>
          <p>
            <Link href="/confidentialite" className="hover:underline">Politique de confidentialité</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(auth): /connexion sign-in page with Google OAuth CTA"
```

---

## Task 7: /compte — account management page

**Files:**
- Create: `app/compte/page.tsx`
- Create: `app/compte/CompteClient.tsx`

- [ ] **Step 1: Create `app/compte/page.tsx`**

```tsx
import type { Metadata } from "next";
import { CompteClient } from "./CompteClient";

export const metadata: Metadata = {
  title: "Mon compte — KEZA",
  robots: { index: false },
};

export default function ComptePage() {
  return <CompteClient />;
}
```

- [ ] **Step 2: Create `app/compte/CompteClient.tsx`**

```tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface ServerProfile {
  balances:       Record<string, number>;
  bankPoints:     Record<string, number>;
  favoriteRoutes: { from: string; to: string }[];
  recentSearches: { from: string; to: string; date: string }[];
}

export function CompteClient() {
  const { data: session, status } = useSession();
  const [serverProfile, setServerProfile] = useState<ServerProfile | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  // Load server profile
  useEffect(() => {
    if (!session?.user?.email) return;
    fetch("/api/profile")
      .then(r => r.ok ? r.json() : null)
      .then((d: { profile?: ServerProfile } | null) => {
        if (d?.profile) setServerProfile(d.profile);
      })
      .catch(() => {});
  }, [session?.user?.email]);

  // Sync localStorage → server
  async function handleSync() {
    setSyncing(true);
    setSyncMsg("");
    try {
      const raw = localStorage.getItem("keza_profile");
      if (!raw) { setSyncMsg("Aucun profil local à synchroniser."); setSyncing(false); return; }
      const profile = JSON.parse(raw);
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        setSyncMsg("✅ Profil synchronisé !");
        setServerProfile(profile as ServerProfile);
      } else {
        setSyncMsg("Erreur lors de la synchronisation.");
      }
    } catch {
      setSyncMsg("Erreur — réessaie.");
    }
    setSyncing(false);
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-3xl">🔒</p>
          <p className="text-sm text-muted">Tu n&apos;es pas connecté.</p>
          <Link href="/connexion" className="inline-block px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
            Se connecter →
          </Link>
        </div>
      </div>
    );
  }

  const { user } = session;

  return (
    <div className="min-h-screen bg-bg">
      <nav className="sticky top-0 z-40 bg-bg/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-muted hover:text-fg transition-colors text-sm">← KEZA</Link>
        <span className="text-border">·</span>
        <span className="text-sm font-bold text-fg">Mon compte</span>
      </nav>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">

        {/* Identity card */}
        <div className="bg-surface rounded-2xl border border-border p-5 flex items-center gap-4">
          {user.image ? (
            <Image src={user.image} alt={user.name ?? "avatar"} width={56} height={56} className="w-14 h-14 rounded-2xl object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl font-black text-primary">
              {(user.name ?? user.email ?? "?")[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            {user.name && <p className="font-black text-fg">{user.name}</p>}
            <p className="text-sm text-muted truncate">{user.email}</p>
            <p className="text-[11px] text-muted/60 mt-0.5">Connecté via Google</p>
          </div>
        </div>

        {/* Sync card */}
        <div className="bg-surface rounded-2xl border border-border p-5 space-y-3">
          <h2 className="text-sm font-black text-fg">Synchronisation des données</h2>
          <p className="text-xs text-muted">
            Ton wallet miles, tes favoris et tes recherches peuvent être synchronisés entre tous tes appareils.
          </p>

          {serverProfile ? (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-black text-fg">{Object.keys(serverProfile.balances ?? {}).length}</p>
                <p className="text-[10px] text-muted">programmes</p>
              </div>
              <div>
                <p className="text-lg font-black text-fg">{(serverProfile.favoriteRoutes ?? []).length}</p>
                <p className="text-[10px] text-muted">favoris</p>
              </div>
              <div>
                <p className="text-lg font-black text-fg">{(serverProfile.recentSearches ?? []).length}</p>
                <p className="text-[10px] text-muted">recherches</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted">Aucune donnée synchronisée pour l&apos;instant.</p>
          )}

          <button
            onClick={handleSync}
            disabled={syncing}
            className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {syncing ? "Synchronisation…" : "⬆️ Synchroniser depuis cet appareil"}
          </button>
          {syncMsg && <p className="text-xs text-center text-success">{syncMsg}</p>}

          <Link href="/profil" className="block text-center text-xs text-primary hover:underline">
            Voir mon wallet miles →
          </Link>
        </div>

        {/* Danger zone */}
        <div className="bg-surface rounded-2xl border border-border p-5 space-y-3">
          <h2 className="text-sm font-black text-fg">Compte</h2>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full py-2.5 rounded-xl border border-border text-sm text-muted hover:text-fg hover:border-primary/40 transition-colors"
          >
            Se déconnecter
          </button>
        </div>

      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add `/compte` to Header nav** (mobile menu)

In `components/Header.tsx`, in the `NAV` arrays:
```ts
// FR nav — add:
{ label: "Mon compte", href: "/compte" },
// EN nav — add:
{ label: "My account", href: "/compte" },
```

- [ ] **Step 4: TypeScript + full tests**

```bash
npx tsc --noEmit 2>&1 | head -20
npx jest --passWithNoTests 2>&1 | tail -10
```

Expected: 0 errors, all tests green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): /compte account page — identity, sync, logout"
```

---

## Task 8: Wire profile sync into ProfilClient

When a user is logged in, `ProfilClient` should load from the server first, then merge with localStorage as fallback.

**Files:**
- Modify: `app/profil/ProfilClient.tsx`

- [ ] **Step 1: Update `ProfilClient.tsx` to load server profile when session exists**

Add imports at the top:
```tsx
import { useSession } from "next-auth/react";
```

In the component body, after the existing state declarations:
```tsx
const { data: session } = useSession();

// Load profile: server when logged in, localStorage always
useEffect(() => {
  const local = loadProfile();
  setProfile(local);

  // If logged in, try to load server profile and merge
  if (session?.user?.email) {
    fetch("/api/profile")
      .then(r => r.ok ? r.json() : null)
      .then((d: { profile?: Partial<UserProfile> } | null) => {
        if (d?.profile) {
          // Server profile wins for wallet data, local wins for preferences
          setProfile(prev => prev ? {
            ...prev,
            balances:       d.profile!.balances       ?? prev.balances,
            bankPoints:     d.profile!.bankPoints      ?? prev.bankPoints,
            favoriteRoutes: d.profile!.favoriteRoutes  ?? prev.favoriteRoutes,
            recentSearches: d.profile!.recentSearches  ?? prev.recentSearches,
          } : prev);
        }
      })
      .catch(() => {});
  }
}, [session?.user?.email]);
```

Replace the existing single `useEffect(() => { setProfile(loadProfile()); }, []);` with the above.

Also add a "sync to cloud" indicator below the hero stat bar when logged in:
```tsx
{session?.user && (
  <div className="flex items-center gap-2 text-[11px] text-success mt-2">
    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
    <span>Synchronisé avec {session.user.email}</span>
  </div>
)}
```

And auto-save to server on every `saveProfile` call:
After the `reload()` calls in wallet actions (addBalance, removeBalance, etc.), also call:
```ts
if (session?.user?.email) {
  fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(loadProfile()),
  }).catch(() => {});
}
```

To avoid repeating this, extract a helper at the top of the component:
```tsx
const syncToServer = useCallback(() => {
  if (!session?.user?.email) return;
  fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(loadProfile()),
  }).catch(() => {});
}, [session?.user?.email]);
```

Then call `syncToServer()` after each `reload()` in addBalance, removeBalance, addBankPoints, removeBankPoints, clearRecents, removeFavorite.

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Full test suite**

```bash
npx jest --passWithNoTests 2>&1 | tail -10
```

Expected: 438+ tests pass (new tests from Tasks 2 and 3 add to the count).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(auth): ProfilClient syncs wallet to server when logged in"
```

---

## Task 9: Push to prod + env var instructions

- [ ] **Step 1: Final push**

```bash
git push
```

- [ ] **Step 2: Add env vars on Vercel**

Go to `vercel.com` → project `keza` → Settings → Environment Variables. Add:

```
NEXTAUTH_SECRET      = <output of: openssl rand -hex 32>
NEXTAUTH_URL         = https://keza-taupe.vercel.app
GOOGLE_CLIENT_ID     = <from Google Cloud Console>
GOOGLE_CLIENT_SECRET = <from Google Cloud Console>
```

- [ ] **Step 3: Configure Google OAuth**

1. Go to https://console.cloud.google.com → Create project "KEZA"
2. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
3. Application type: **Web application**
4. Authorized redirect URIs: `https://keza-taupe.vercel.app/api/auth/callback/google`
5. Copy Client ID and Client Secret → paste in Vercel env vars

- [ ] **Step 4: Redeploy**

Trigger a redeploy on Vercel (or next push auto-deploys).

---

## Self-Review

**Spec coverage:**
- ✅ Google OAuth login
- ✅ Server-side profile in Redis
- ✅ Multi-device sync
- ✅ Account page (/compte)
- ✅ Login page (/connexion)
- ✅ Auth in Header
- ✅ Anonymous users unchanged
- ✅ Extendable to Facebook/Apple (add provider in `lib/auth.ts`)

**Placeholder scan:** None found.

**Type consistency:**
- `UserProfile` used throughout — imported from `@/lib/userProfile`
- `session.user.email` used consistently
- `ServerProfile` in `CompteClient` matches fields in `UserProfile`

**Engine routes untouched:** `/api/search`, `/api/search/stream`, `/api/alerts`, `/api/calendar`, `/api/trending` — none modified.

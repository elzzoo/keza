import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Validate OAuth credentials at startup (not in test environment)
if (process.env.NODE_ENV !== "test") {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn("[auth] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not set — Google OAuth will not work");
  }
}

// ── NextAuth configuration ────────────────────────────────────────────────────
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
        session.user.email = String(token.email);
      }
      return session;
    },
  },

  pages: {
    signIn:  "/connexion",   // custom sign-in page (created in Task 6)
    error:   "/connexion",   // auth errors redirect there too
  },

  secret: process.env.NEXTAUTH_SECRET,
};
// ─────────────────────────────────────────────────────────────────────────────

export const ADMIN_SESSION_COOKIE = "keza_admin_session";
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

export function safeCompare(a: string, b: string): boolean {
  // Length must match first — leaking length is acceptable (it's visible in protocol),
  // but we must not let length differences cause variable-time content comparison.
  if (a.length !== b.length) return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return timingSafeEqual(aBuf, bBuf);
}

export function hasBearerSecret(request: Request, secret: string | undefined): boolean {
  if (!secret) return false;
  const authHeader = request.headers.get("authorization") ?? "";
  return safeCompare(authHeader, `Bearer ${secret}`);
}

export function hasCronSecret(request: Request): boolean {
  return hasBearerSecret(request, process.env.CRON_SECRET);
}

export function hasAdminSecret(request: Request): boolean {
  return hasBearerSecret(request, process.env.ADMIN_SECRET);
}

function getAdminSecret(): string | undefined {
  const secret = process.env.ADMIN_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    console.error("[auth] ADMIN_SECRET is not set — admin login disabled");
  }
  return secret;
}

function signAdminSession(exp: number, secret: string): string {
  return createHmac("sha256", secret).update(String(exp)).digest("base64url");
}

export function createAdminSessionToken(now = Date.now()): string | null {
  const secret = getAdminSecret();
  if (!secret) return null;

  const exp = Math.floor(now / 1000) + ADMIN_SESSION_TTL_SECONDS;
  const sig = signAdminSession(exp, secret);
  return `${exp}.${sig}`;
}

export function verifyAdminSessionToken(token: string | undefined, now = Date.now()): boolean {
  const secret = getAdminSecret();
  if (!secret || !token) return false;

  const [expRaw, sig] = token.split(".");
  if (!expRaw || !sig) return false;

  const exp = Number(expRaw);
  if (!Number.isInteger(exp) || exp <= Math.floor(now / 1000)) return false;

  const expected = signAdminSession(exp, secret);
  return safeCompare(sig, expected);
}

export function adminSessionMaxAgeSeconds(): number {
  return ADMIN_SESSION_TTL_SECONDS;
}

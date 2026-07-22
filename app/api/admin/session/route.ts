import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionMaxAgeSeconds,
  createAdminSessionToken,
  safeCompare,
} from "@/lib/auth";
import { rateLimitResponse } from "@/lib/ratelimit";

function redirectToAdmin(req: NextRequest): NextResponse {
  return NextResponse.redirect(new URL("/admin", req.url), { status: 303 });
}

function clearAdminSession(res: NextResponse): void {
  res.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 0,
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (req.nextUrl.searchParams.get("_method") === "DELETE") {
    const res = redirectToAdmin(req);
    clearAdminSession(res);
    return res;
  }

  // Protect against brute-force: 5 attempts per 15 minutes per IP
  const limited = await rateLimitResponse(req, {
    namespace: "admin:session",
    limit: 5,
    windowSeconds: 15 * 60,
  });
  if (limited) return limited;

  const form = await req.formData();
  const submittedSecret = String(form.get("secret") ?? "");

  // This used to also require a "csrf" form field / X-CSRF-Token header,
  // verified by comparing it to itself (lib/csrf.ts's verifyCsrfToken(x, x))
  // — always true for a non-empty value, so it was never real protection.
  // The login form (app/admin/page.tsx) never actually submitted a "csrf"
  // field either, so in production every login attempt hit the
  // "CSRF token required" branch before the secret was even checked —
  // nobody could log in. Removed; the real gate below (timing-safe secret
  // compare) plus the 5-attempts/15min rate limit above are what actually
  // protect this endpoint.

  // Never fall back to CRON_SECRET — compromise of cron token must not grant admin access.
  const expectedSecret = process.env.ADMIN_SECRET;

  if (!expectedSecret || !safeCompare(submittedSecret, expectedSecret)) {
    const res = redirectToAdmin(req);
    clearAdminSession(res);
    return res;
  }

  const token = createAdminSessionToken();
  const res = redirectToAdmin(req);

  if (!token) {
    clearAdminSession(res);
    return res;
  }

  res.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: adminSessionMaxAgeSeconds(),
  });

  return res;
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const res = redirectToAdmin(req);
  clearAdminSession(res);
  return res;
}

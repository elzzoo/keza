import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionMaxAgeSeconds,
  createAdminSessionToken,
  safeCompare,
} from "@/lib/auth";

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

  const form = await req.formData();
  const submittedSecret = String(form.get("secret") ?? "");
  const expectedSecret = process.env.ADMIN_SECRET ?? process.env.CRON_SECRET;

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

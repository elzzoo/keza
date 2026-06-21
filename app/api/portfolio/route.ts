import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getServerProfile, saveServerProfile } from "@/lib/serverProfile";
import { rateLimitResponse } from "@/lib/ratelimit";
import { logError } from "@/lib/logger";
import type { UserProfile } from "@/lib/userProfile";

export async function GET(req: NextRequest) {
  const limited = await rateLimitResponse(req, { namespace: "api:portfolio:get", limit: 60, windowSeconds: 60 });
  if (limited) return limited;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      // Unauthenticated users rely on localStorage
      return NextResponse.json({ portfolio: null }, { status: 200 });
    }

    const email = session.user.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email in session" }, { status: 401 });
    }

    const portfolio = await getServerProfile(email);
    return NextResponse.json({ portfolio });
  } catch (err) {
    logError("[api/portfolio] GET", err);
    return NextResponse.json({ error: "Failed to fetch portfolio" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const limited = await rateLimitResponse(req, { namespace: "api:portfolio:patch", limit: 20, windowSeconds: 60 });
  if (limited) return limited;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      // Unauthenticated users can't save to server
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = session.user.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email in session" }, { status: 401 });
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch (err) {
      logError("[api/portfolio] PATCH - JSON parse", err);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Save the full profile to Redis (balances, bankPoints, etc.)
    const profile = raw as UserProfile;
    await saveServerProfile(email, profile);

    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("[api/portfolio] PATCH", err);
    return NextResponse.json({ error: "Failed to update portfolio" }, { status: 500 });
  }
}

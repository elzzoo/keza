import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getServerProfile, saveServerProfile } from "@/lib/serverProfile";
import { rateLimitResponse } from "@/lib/ratelimit";
import { logError } from "@/lib/logger";

// Zod schema for PATCH /api/profile — prevents arbitrary blob storage in Redis.
// Mirrors UserProfile but with explicit size bounds on every field.
const ProfilePatchSchema = z.object({
  programs:        z.array(z.string().max(80)).max(30).optional(),
  currency:        z.string().max(10).optional(),
  lang:            z.enum(["fr", "en"]).optional(),
  cabin:           z.enum(["economy", "premium", "business", "first"]).optional(),
  balances:        z.record(z.string().max(80), z.number().min(0).max(1e9)).optional(),
  bankPoints:      z.record(z.string().max(80), z.number().min(0).max(1e9)).optional(),
  hasOnboarded:    z.boolean().optional(),
  recentSearches:  z.array(z.object({
    from:           z.string().length(3),
    to:             z.string().length(3),
    date:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    cabin:          z.string().max(20),
    tripType:       z.enum(["oneway", "roundtrip"]),
    timestamp:      z.string().max(30),
    bestSavings:    z.number().optional(),
    recommendation: z.enum(["USE_MILES", "USE_CASH", "IF_HAVE_MILES"]).optional(),
  })).max(10).optional(),
  favoriteRoutes:  z.array(z.object({
    from:    z.string().length(3),
    to:      z.string().length(3),
    addedAt: z.string().max(30),
  })).max(20).optional(),
  createdAt:    z.string().max(30).optional(),
  lastActiveAt: z.string().max(30).optional(),
}).strict();

export async function GET(req: NextRequest) {
  const limited = await rateLimitResponse(req, { namespace: "api:profile:get", limit: 60, windowSeconds: 60 });
  if (limited) return limited;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // SECURITY: Always fetch the current user's profile, never allow cross-user access.
    // Explicitly verify email format to prevent edge cases.
    const email = session.user.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email in session" }, { status: 401 });
    }

    const profile = await getServerProfile(email);
    return NextResponse.json({ profile });
  } catch (err) {
    logError("[api/profile] GET", err);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const limited = await rateLimitResponse(req, { namespace: "api:profile:patch", limit: 20, windowSeconds: 60 });
  if (limited) return limited;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // SECURITY: Always update the current user's profile, never allow cross-user access.
    // Explicitly verify email format to prevent edge cases.
    const email = session.user.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email in session" }, { status: 401 });
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch (err) {
      logError("[api/profile] PATCH - JSON parse", err);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = ProfilePatchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid profile data", details: parsed.error.flatten() }, { status: 400 });
    }

    await saveServerProfile(email, parsed.data as Parameters<typeof saveServerProfile>[1]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("[api/profile] PATCH", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

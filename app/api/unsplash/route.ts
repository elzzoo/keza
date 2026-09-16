// app/api/unsplash/route.ts
// Server-side proxy — keeps UNSPLASH_ACCESS_KEY out of the client bundle.
import { NextResponse } from "next/server";
import { DESTINATIONS } from "@/data/destinations";
import { redis } from "@/lib/redis";
import { rateLimitResponse } from "@/lib/ratelimit";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

const CACHE_TTL = 60 * 60 * 24 * 30; // 30 jours
const ALLOWED_QUERIES = new Set(DESTINATIONS.map((dest) => dest.unsplashQuery.toLowerCase()));

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function GET(request: Request) {
  const limited = await rateLimitResponse(request, { namespace: "api:unsplash", limit: 20, windowSeconds: 60 });
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const query = normalizeQuery(searchParams.get("query") ?? "");

  if (!query) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }
  if (query.length > 80 || !ALLOWED_QUERIES.has(query)) {
    return NextResponse.json({ error: "query not allowed" }, { status: 400 });
  }

  const key = `keza:unsplash:${query.replace(/\s+/g, "-")}`;

  // 1. Check Redis cache
  try {
    const cached = await redis.get<{ url: string; credit: string }>(key);
    if (cached) return NextResponse.json(cached);
  } catch { /* cache miss */ }

  // 2. Fetch from Unsplash
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json({ error: "Unsplash not configured" }, { status: 503 });
  }

  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&content_filter=high`,
      { headers: { Authorization: `Client-ID ${accessKey}` } }
    );

    if (!res.ok) throw new Error(`Unsplash ${res.status}`);

    const data = await res.json();
    const result = {
      url: (data.urls?.regular as string | undefined) ?? null,
      credit: `Photo by ${data.user?.name ?? "unknown"} on Unsplash`,
    };

    // 3. Cache in Redis
    try {
      await redis.set(key, result, { ex: CACHE_TTL });
    } catch { /* non-fatal */ }

    return NextResponse.json(result);
  } catch (err) {
    logError("[api/unsplash] error:", err);
    return NextResponse.json({ url: null, credit: "" });
  }
}

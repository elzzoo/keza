import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { rateLimitResponse } from "@/lib/ratelimit";

export const runtime = "nodejs";  // Redis client requires Node.js

export async function POST(request: Request) {
  const limited = await rateLimitResponse(request, { namespace: "api:track:click", limit: 60, windowSeconds: 60 });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    typeof body !== "object" || body === null ||
    !("searchId" in body) || typeof (body as Record<string, unknown>).searchId !== "string" ||
    !("route"    in body) || typeof (body as Record<string, unknown>).route    !== "string"
  ) {
    return NextResponse.json({ error: "Missing required fields: searchId, route" }, { status: 400 });
  }

  const { searchId, route, program } = body as { searchId: string; route: string; program?: string };

  const today = new Date().toISOString().slice(0, 10);

  // Fire-and-forget: per-search click counter, expires after 30 days
  const key = `keza:clicks:${searchId}:${route}`;
  redis.incr(key).then(() => redis.expire(key, 60 * 60 * 24 * 30)).catch(() => {});

  // Aggregate counter per route (all time)
  redis.incr(`keza:clicks:route:${route}`).catch(() => {});

  if (program) {
    redis.incr(`keza:clicks:program:${program}`).catch(() => {});
  }

  // Daily + total stats (for admin dashboard)
  redis.incr(`keza:stats:clicks:${today}`).catch(() => {});
  redis.incr(`keza:stats:clicks:total`).catch(() => {});

  return NextResponse.json({ ok: true }, { status: 200 });
}

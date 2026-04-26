import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export const runtime = "nodejs";  // Redis client requires Node.js

export async function POST(request: Request) {
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

  // Fire-and-forget: increment click counter, expire after 30 days
  const key = `keza:clicks:${searchId}:${route}`;
  redis.incr(key).then(() => redis.expire(key, 60 * 60 * 24 * 30)).catch(() => {});

  // Also increment aggregate counter per route (all time)
  const aggKey = `keza:clicks:route:${route}`;
  redis.incr(aggKey).catch(() => {});

  if (program) {
    const progKey = `keza:clicks:program:${program}`;
    redis.incr(progKey).catch(() => {});
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

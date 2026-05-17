import "server-only";
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export interface RateLimitOptions {
  namespace: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  limited: boolean;
  count: number;
  remaining: number;
  resetSeconds: number;
}

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function safeKeyPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9:._-]/g, "_").slice(0, 120);
}

export async function checkRateLimit(
  request: Request,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const ip = safeKeyPart(clientIp(request));
  const namespace = safeKeyPart(options.namespace);
  const key = `keza:ratelimit:${namespace}:${ip}`;

  // Fix: SET NX EX creates the key with its TTL in a single atomic command,
  // so the expiry is always set when the key is first created.  The old
  // INCR-then-EXPIRE pattern had a race where a crash between the two calls
  // could leave the key with no TTL, causing it to persist indefinitely.
  // SET NX is a no-op when the key already exists, so live counters are safe.
  await redis.set(key, "0", { ex: options.windowSeconds, nx: true });
  const count = await redis.incr(key);

  const ttl = await redis.ttl(key).catch(() => options.windowSeconds);
  const resetSeconds = typeof ttl === "number" && ttl > 0 ? ttl : options.windowSeconds;

  return {
    limited: count > options.limit,
    count,
    remaining: Math.max(options.limit - count, 0),
    resetSeconds,
  };
}

export async function rateLimitResponse(
  request: Request,
  options: RateLimitOptions
): Promise<NextResponse | null> {
  const result = await checkRateLimit(request, options);
  if (!result.limited) return null;

  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.resetSeconds),
        "X-RateLimit-Limit": String(options.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.resetSeconds),
      },
    }
  );
}

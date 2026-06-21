import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { hasAdminSecret } from "@/lib/auth";
import { rateLimitResponse } from "@/lib/ratelimit";
import { updateMilesPricesSchema } from "@/lib/adminSchemas";

// ── Admin endpoint to update miles values dynamically ────────────────────────
// POST /api/admin/update-data
// Headers: Authorization: Bearer <ADMIN_SECRET>
// Body: { "program": "Flying Blue", "valueCents": 1.5 }
//   OR: { "programs": { "Flying Blue": 1.5, "Turkish Miles&Smiles": 1.4 } }
//
// Updates are stored in Redis with 7-day TTL. The costEngine reads from Redis
// first, falling back to static values in milesPrices.ts.
//
// This allows updating mile valuations without redeploying the app.

const VALID_PROGRAMS = [
  "Flying Blue",
  "Turkish Miles&Smiles",
  "Emirates Skywards",
  "Qatar Privilege Club",
  "British Airways Avios",
  "Ethiopian ShebaMiles",
  "Air Canada Aeroplan",
  "United MileagePlus",
  "Amex MR",
  "Chase UR",
  "Citi ThankYou",
  "Capital One Miles",
];

const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export async function POST(request: Request): Promise<NextResponse> {
  // Rate limit: 20 requests per hour per IP
  const limited = await rateLimitResponse(request, {
    namespace: "admin:update-data",
    limit: 20,
    windowSeconds: 60 * 60,
  });
  if (limited) return limited;

  // Auth check
  if (!hasAdminSecret(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = updateMilesPricesSchema.safeParse(body);

    if (!result.success) {
      const error = result.error.issues[0];
      return NextResponse.json(
        { ok: false, error: `${error.path.join(".")}: ${error.message}` },
        { status: 400 }
      );
    }

    const { program, valueCents, programs } = result.data;
    const updated: Array<{ program: string; valueCents: number }> = [];

    // Single program update
    if (program && valueCents) {
      if (!VALID_PROGRAMS.includes(program)) {
        return NextResponse.json({ ok: false, error: `Unknown program: ${program}` }, { status: 400 });
      }
      await redis.set(`miles:price:${program}`, valueCents, { ex: TTL_SECONDS });
      updated.push({ program, valueCents });
    }

    // Batch update
    if (programs) {
      for (const [prog, value] of Object.entries(programs)) {
        if (!VALID_PROGRAMS.includes(prog)) continue;
        await redis.set(`miles:price:${prog}`, value, { ex: TTL_SECONDS });
        updated.push({ program: prog, valueCents: value });
      }
    }

    if (updated.length === 0) {
      return NextResponse.json({ ok: false, error: "No valid updates provided" }, { status: 400 });
    }

    // Log the update timestamp
    await redis.set("miles:prices:lastUpdated", new Date().toISOString(), { ex: TTL_SECONDS });

    return NextResponse.json({
      ok: true,
      updated,
      timestamp: new Date().toISOString(),
      ttlDays: 7,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// GET: show current effective prices (static + overrides)
export async function GET(request: Request): Promise<NextResponse> {
  // Rate limit: 20 requests per hour per IP
  const limited = await rateLimitResponse(request, {
    namespace: "admin:update-data",
    limit: 20,
    windowSeconds: 60 * 60,
  });
  if (limited) return limited;

  if (!hasAdminSecret(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { MILES_PRICE_MAP } = await import("@/data/milesPrices");
    const result: Record<string, { static: number; redis: number | null; effective: number }> = {};

    const entries = Array.from(MILES_PRICE_MAP.entries());
    for (const [program, staticValue] of entries) {
      const redisValue = await redis.get<number>(`miles:price:${program}`).catch(() => null);
      result[program] = {
        static: staticValue,
        redis: typeof redisValue === "number" ? redisValue : null,
        effective: typeof redisValue === "number" ? redisValue : staticValue,
      };
    }

    const lastUpdated = await redis.get<string>("miles:prices:lastUpdated").catch(() => null);

    return NextResponse.json({
      ok: true,
      prices: result,
      lastUpdated,
      note: "Redis values override static. TTL = 7 days. Use POST to update.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

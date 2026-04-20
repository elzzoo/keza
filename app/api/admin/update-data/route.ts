import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { redis } from "@/lib/redis";

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

function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a.padEnd(256));
  const bBuf = Buffer.from(b.padEnd(256));
  return timingSafeEqual(aBuf, bBuf) && a.length === b.length;
}

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
  // Auth check
  const secret = process.env.ADMIN_SECRET ?? process.env.CRON_SECRET;
  const authHeader = request.headers.get("Authorization");
  if (!secret || !authHeader || !safeCompare(authHeader, `Bearer ${secret}`)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const updated: Array<{ program: string; valueCents: number }> = [];

    // Single program update
    if (body.program && typeof body.valueCents === "number") {
      if (!VALID_PROGRAMS.includes(body.program)) {
        return NextResponse.json({ ok: false, error: `Unknown program: ${body.program}` }, { status: 400 });
      }
      if (body.valueCents < 0.1 || body.valueCents > 10) {
        return NextResponse.json({ ok: false, error: "valueCents must be between 0.1 and 10" }, { status: 400 });
      }
      await redis.set(`miles:price:${body.program}`, body.valueCents, { ex: TTL_SECONDS });
      updated.push({ program: body.program, valueCents: body.valueCents });
    }

    // Batch update
    if (body.programs && typeof body.programs === "object") {
      for (const [program, value] of Object.entries(body.programs)) {
        if (!VALID_PROGRAMS.includes(program)) continue;
        const v = value as number;
        if (typeof v !== "number" || v < 0.1 || v > 10) continue;
        await redis.set(`miles:price:${program}`, v, { ex: TTL_SECONDS });
        updated.push({ program, valueCents: v });
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
  const secret = process.env.ADMIN_SECRET ?? process.env.CRON_SECRET;
  const authHeader = request.headers.get("Authorization");
  if (!secret || !authHeader || !safeCompare(authHeader, `Bearer ${secret}`)) {
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

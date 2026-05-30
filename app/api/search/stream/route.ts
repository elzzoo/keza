import { randomUUID } from "crypto";
import { searchEngineStream } from "@/lib/engine/stream";
import type { SearchParams, FlightResult } from "@/lib/engine";
import { getForexRate } from "@/lib/autoCalibrate";
import { rateLimitResponse } from "@/lib/ratelimit";
import { logError } from "@/lib/logger";

// Vercel Hobby hard-kills at 10s. SSE partial arrives in ~2-3s, final in ~5-8s — fits.
export const maxDuration = 10;

const IATA_RE = /^[A-Z]{3}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function sanitizeCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const upper = raw.trim().toUpperCase();
  return IATA_RE.test(upper) ? upper : null;
}

/**
 * SSE streaming search endpoint.
 *
 * Sends Server-Sent Events:
 *   data: {"type":"partial","results":[...],"forexRate":600}\n\n   — Duffel results only (~2-3s)
 *   data: {"type":"final","results":[...],"forexRate":600}\n\n     — merged Duffel+TP (~5-8s)
 *
 * Falls back to {"type":"error","message":"..."} on failure.
 * If only a partial was sent before an error, the client keeps the partial.
 */
export async function POST(request: Request) {
  const requestId = randomUUID();

  const limited = await rateLimitResponse(request, {
    namespace: "api:search:stream:post",
    limit: 30,
    windowSeconds: 60,
  });
  if (limited) return limited;

  let body: Partial<SearchParams>;
  try {
    body = await request.json() as Partial<SearchParams>;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const from = sanitizeCode(body.from);
  const to   = sanitizeCode(body.to);
  const date = typeof body.date === "string" && DATE_RE.test(body.date) ? body.date : null;
  if (!from || !to || !date) {
    return new Response(
      JSON.stringify({ error: "Invalid input: from/to must be IATA codes, date must be YYYY-MM-DD" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const passengers = Math.min(Math.max(Number(body.passengers) || 1, 1), 9);
  const searchParams: SearchParams = {
    from, to, date,
    returnDate:   body.returnDate && DATE_RE.test(body.returnDate) ? body.returnDate : undefined,
    tripType:     body.tripType === "roundtrip" ? "roundtrip" : "oneway",
    stops:        body.stops === "direct" ? "direct" : "any",
    cabin:        (["economy", "premium", "business", "first"] as const).includes(body.cabin as never)
                    ? (body.cabin as "economy" | "premium" | "business" | "first")
                    : "economy",
    passengers,
    userPrograms: Array.isArray(body.userPrograms)
      ? body.userPrograms.filter((p): p is string => typeof p === "string").slice(0, 20)
      : [],
  };

  const encoder = new TextEncoder();
  let partialSent = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      // Fetch forex rate in background — attach to both partial and final
      const forexPromise = getForexRate().catch(() => 600);

      try {
        const finalResults = await searchEngineStream(
          searchParams,
          async (partial: FlightResult[]) => {
            partialSent = true;
            const forexRate = await forexPromise;
            send({ type: "partial", results: partial, forexRate });
          },
          requestId,
        );
        const forexRate = await forexPromise;
        send({ type: "final", results: finalResults, forexRate });
      } catch (err) {
        logError("[api/search/stream]", err, { requestId });
        // If partial already sent, the client has something useful — send a soft error
        // so it knows not to keep a loading indicator.
        send({ type: "error", message: "Search failed", partialSent });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":    "text/event-stream",
      "Cache-Control":   "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "Connection":      "keep-alive",
      "X-Request-Id":    requestId,
    },
  });
}

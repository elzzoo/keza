import { NextRequest, NextResponse } from "next/server";
import {
  createAlert,
  getAlertById,
  getAlertsByEmail,
  sendAlertConfirmationEmail,
} from "@/lib/alerts";
import { verifyManageAlertsToken } from "@/lib/alertTokens";
import { rateLimitResponse } from "@/lib/ratelimit";
import { isValidEmail, isValidIata, isValidCabin, isValidPrice } from "@/lib/validate";
import { logError } from "@/lib/logger";

// POST /api/alerts — create a new price alert
export async function POST(req: NextRequest) {
  const limited = await rateLimitResponse(req, {
    namespace: "api:alerts:post",
    limit: 5,
    windowSeconds: 60 * 60,
  });
  if (limited) return limited;

  try {
    const body = await req.json();
    const { email, from, to, cabin, currentPrice } = body;

    if (!email || !from || !to || !currentPrice) {
      return NextResponse.json(
        { error: "Missing required fields: email, from, to, currentPrice" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (!isValidIata(from) || !isValidIata(to)) {
      return NextResponse.json({ error: "from and to must be valid 3-letter IATA codes" }, { status: 400 });
    }
    if (cabin && !isValidCabin(cabin)) {
      return NextResponse.json({ error: "cabin must be economy, premium, business, or first" }, { status: 400 });
    }
    if (!isValidPrice(currentPrice)) {
      return NextResponse.json({ error: "currentPrice must be a positive number up to 50000" }, { status: 400 });
    }

    const FREE_ALERT_LIMIT = 3;

    // Freemium gate: max 3 active alerts on free plan
    const existing = await getAlertsByEmail(email);
    const activeExisting = existing.filter((a) => a.active);
    if (activeExisting.length >= FREE_ALERT_LIMIT) {
      return NextResponse.json(
        {
          error: `Limite gratuite atteinte (${FREE_ALERT_LIMIT} alertes maximum). Passez en Pro pour des alertes illimitées.`,
          code: "FREE_LIMIT_REACHED",
          limit: FREE_ALERT_LIMIT,
          current: activeExisting.length,
        },
        { status: 429 }
      );
    }

    // Check for duplicate (same route + cabin)
    const duplicate = existing.find(
      (a) => a.from === from.toUpperCase() && a.to === to.toUpperCase() && a.cabin === cabin
    );
    if (duplicate) {
      return NextResponse.json(
        { error: "Alert already exists for this route and cabin", existingId: duplicate.id },
        { status: 409 }
      );
    }

    const alert = await createAlert({
      email,
      from,
      to,
      cabin: cabin || "economy",
      currentPrice: Number(currentPrice),
    });

    // Fire-and-forget: confirmation email — do not await, must not block the response
    sendAlertConfirmationEmail(alert).catch((e) => logError("[api/alerts] confirmation email", e));

    return NextResponse.json({ ok: true, alert }, { status: 201 });
  } catch (err) {
    logError("[api/alerts] POST", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/alerts?email=xxx&token=xxx — list active alerts for a verified email
export async function GET(req: NextRequest) {
  const limited = await rateLimitResponse(req, {
    namespace: "api:alerts:get",
    limit: 30,
    windowSeconds: 60,
  });
  if (limited) return limited;

  const email = req.nextUrl.searchParams.get("email");
  const token = req.nextUrl.searchParams.get("token");
  if (!email) {
    return NextResponse.json({ error: "Missing email param" }, { status: 400 });
  }
  if (!verifyManageAlertsToken(email, token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const alerts = await getAlertsByEmail(email);
  return NextResponse.json({ alerts });
}

// DELETE /api/alerts?id=xxx&email=xxx&token=xxx — deactivate an alert for a verified email
export async function DELETE(req: NextRequest) {
  const limited = await rateLimitResponse(req, {
    namespace: "api:alerts:delete",
    limit: 20,
    windowSeconds: 60 * 60,
  });
  if (limited) return limited;

  const id = req.nextUrl.searchParams.get("id");
  const email = req.nextUrl.searchParams.get("email");
  const token = req.nextUrl.searchParams.get("token");
  if (!id) {
    return NextResponse.json({ error: "Missing id param" }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ error: "Missing email param" }, { status: 400 });
  }
  if (!verifyManageAlertsToken(email, token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { deactivateAlert } = await import("@/lib/alerts");
    const alert = await getAlertById(id);
    if (!alert || alert.email !== email.trim().toLowerCase()) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }
    const ok = await deactivateAlert(id);
    if (!ok) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    logError("[api/alerts] DELETE", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

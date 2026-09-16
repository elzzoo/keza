import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createMilesAlert, getMilesAlertsByEmail, deactivateMilesAlert } from "@/lib/miles-alerts";
import { createManageAlertsToken, verifyManageAlertsToken } from "@/lib/alertTokens";
import { rateLimitResponse } from "@/lib/ratelimit";
import { isValidEmail, isValidIata } from "@/lib/validate";

// This route used to have no auth at all: GET accepted ?email=... and DELETE
// accepted an alertId (format "email:route:program", guessable) with no
// proof of ownership — anyone who knew or guessed a victim's email could
// enumerate or delete their miles alerts. Fixed by reusing the same
// HMAC-signed manage token already used by /api/alerts (lib/alertTokens.ts,
// stateless — verifiable from just the email + server secret). POST now
// returns the token; the client stores it and must present it as
// "Authorization: Bearer <token>" on GET/DELETE.
//
// If the local token is lost, /api/miles-alerts/manage-link emails a fresh
// signed link without exposing whether a given email has existing alerts.

const ALERT_KEY_PREFIX = "keza:miles-alert:";
const PROGRAM_MAX_LENGTH = 120;

function extractEmailFromAlertId(alertId: string): string | null {
  // Real format (see lib/miles-alerts.ts buildAlertKey): the full Redis key
  // "keza:miles-alert:email:route:program" is what the client sends as
  // alertId — not the bare "email:route:program" this originally assumed,
  // which would have extracted "keza" as the "email" and made every
  // DELETE fail its ownership check.
  if (!alertId.startsWith(ALERT_KEY_PREFIX)) return null;
  const rest = alertId.slice(ALERT_KEY_PREFIX.length);
  const idx = rest.indexOf(":");
  return idx > 0 ? rest.slice(0, idx) : null;
}

function normalizeRoute(route: string): string | null {
  const [from, to, ...extra] = route.trim().toUpperCase().split("-");
  if (extra.length > 0 || !isValidIata(from) || !isValidIata(to) || from === to) {
    return null;
  }
  return `${from}-${to}`;
}

/**
 * POST /api/miles-alerts
 * Create a new miles alert
 *
 * Body: { email, route, program, thresholdCpp }
 * Response: 201 with alert details + manageToken on success, 400 on validation error, 500 on error
 */
export async function POST(request: NextRequest) {
  const limited = await rateLimitResponse(request, {
    namespace: "api:miles-alerts:post",
    limit: 5,
    windowSeconds: 60 * 60,
  });
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    // Malformed JSON is a client error, not a server failure — don't let it
    // fall into the catch-all below, which used to report it as a 500.
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "email is invalid" }, { status: 400 });
    }

    const route = typeof body.route === "string" ? normalizeRoute(body.route) : null;
    if (!route) {
      return NextResponse.json({ error: "route must use IATA-IATA format" }, { status: 400 });
    }

    const program = typeof body.program === "string" ? body.program.trim() : "";
    if (!program || program.length > PROGRAM_MAX_LENGTH) {
      return NextResponse.json({ error: "program is invalid" }, { status: 400 });
    }

    if (body.thresholdCpp === undefined || typeof body.thresholdCpp !== "number") {
      return NextResponse.json({ error: "thresholdCpp is required" }, { status: 400 });
    }

    // Validate thresholdCpp range
    if (body.thresholdCpp < 0.1 || body.thresholdCpp > 10) {
      return NextResponse.json(
        { error: "thresholdCpp must be between 0.1 and 10" },
        { status: 400 }
      );
    }

    // Create the alert
    await createMilesAlert({
      email,
      route,
      program,
      thresholdCpp: body.thresholdCpp,
    });

    const manageToken = createManageAlertsToken(email);

    // Return the created alert
    return NextResponse.json(
      {
        email,
        route,
        program,
        thresholdCpp: body.thresholdCpp,
        manageToken,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[miles-alerts POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * GET /api/miles-alerts?email=...
 * Retrieve alerts by email — requires proof of ownership via manage token.
 *
 * Query param: email (required)
 * Header: Authorization: Bearer <manageToken>
 * Response: 200 with { alerts: [] } on success, 400 if email missing, 401 if unauthorized, 500 on error
 */
export async function GET(request: NextRequest) {
  const limited = await rateLimitResponse(request, {
    namespace: "api:miles-alerts:get",
    limit: 20,
    windowSeconds: 60,
  });
  if (limited) return limited;

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    // Validate email is provided
    if (!email) {
      return NextResponse.json({ error: "email query parameter is required" }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!verifyManageAlertsToken(email, token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get alerts
    const alerts = await getMilesAlertsByEmail(email);

    return NextResponse.json({ alerts }, { status: 200 });
  } catch (error) {
    console.error("[miles-alerts GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * DELETE /api/miles-alerts
 * Delete an alert — requires proof of ownership via manage token.
 *
 * Body: { alertId } where alertId = "email:route:program"
 * Header: Authorization: Bearer <manageToken>
 * Response: 200 on success, 400 if alertId missing, 401 if unauthorized, 500 on error
 */
export async function DELETE(request: NextRequest) {
  const limited = await rateLimitResponse(request, {
    namespace: "api:miles-alerts:delete",
    limit: 20,
    windowSeconds: 60,
  });
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    // Validate alertId is provided
    if (!body.alertId || typeof body.alertId !== "string") {
      return NextResponse.json({ error: "alertId is required" }, { status: 400 });
    }

    const email = extractEmailFromAlertId(body.alertId);
    if (!email) {
      return NextResponse.json({ error: "alertId is malformed" }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!verifyManageAlertsToken(email, token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Deactivate the alert
    await deactivateMilesAlert(body.alertId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[miles-alerts DELETE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

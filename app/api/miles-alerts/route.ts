import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createMilesAlert, getMilesAlertsByEmail, deactivateMilesAlert } from "@/lib/miles-alerts";
import { createManageAlertsToken, verifyManageAlertsToken } from "@/lib/alertTokens";
import { rateLimitResponse } from "@/lib/ratelimit";

// This route used to have no auth at all: GET accepted ?email=... and DELETE
// accepted an alertId (format "email:route:program", guessable) with no
// proof of ownership — anyone who knew or guessed a victim's email could
// enumerate or delete their miles alerts. Fixed by reusing the same
// HMAC-signed manage token already used by /api/alerts (lib/alertTokens.ts,
// stateless — verifiable from just the email + server secret). POST now
// returns the token; the client stores it and must present it as
// "Authorization: Bearer <token>" on GET/DELETE.
//
// Known limitation: the token is only ever handed back at creation time (no
// email-based recovery yet, unlike /alertes' magic-link flow), so a user who
// created an alert on a different device/browser can't manage it from this
// one. Worth a follow-up to email the manage link the same way lib/alerts.ts
// already does for regular price alerts.

const ALERT_KEY_PREFIX = "keza:miles-alert:";

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

  try {
    const body = await request.json();

    // Validate all required fields
    if (!body.email || typeof body.email !== "string") {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    if (!body.route || typeof body.route !== "string") {
      return NextResponse.json({ error: "route is required" }, { status: 400 });
    }

    if (!body.program || typeof body.program !== "string") {
      return NextResponse.json({ error: "program is required" }, { status: 400 });
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
      email: body.email,
      route: body.route,
      program: body.program,
      thresholdCpp: body.thresholdCpp,
    });

    const manageToken = createManageAlertsToken(body.email);

    // Return the created alert
    return NextResponse.json(
      {
        email: body.email,
        route: body.route,
        program: body.program,
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

  try {
    const body = await request.json();

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

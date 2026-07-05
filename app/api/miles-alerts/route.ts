import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createMilesAlert, getMilesAlertsByEmail, deactivateMilesAlert } from "@/lib/miles-alerts";

/**
 * POST /api/miles-alerts
 * Create a new miles alert
 *
 * Body: { email, route, program, thresholdCpp }
 * Response: 201 with alert details on success, 400 on validation error, 500 on error
 */
export async function POST(request: NextRequest) {
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

    // Return the created alert
    return NextResponse.json(
      {
        email: body.email,
        route: body.route,
        program: body.program,
        thresholdCpp: body.thresholdCpp,
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
 * Retrieve alerts by email
 *
 * Query param: email (required)
 * Response: 200 with { alerts: [] } on success, 400 if email missing, 500 on error
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    // Validate email is provided
    if (!email) {
      return NextResponse.json({ error: "email query parameter is required" }, { status: 400 });
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
 * Delete an alert
 *
 * Body: { alertId } where alertId = "email:route:program"
 * Response: 200 on success, 400 if alertId missing, 500 on error
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate alertId is provided
    if (!body.alertId || typeof body.alertId !== "string") {
      return NextResponse.json({ error: "alertId is required" }, { status: 400 });
    }

    // Deactivate the alert
    await deactivateMilesAlert(body.alertId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[miles-alerts DELETE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

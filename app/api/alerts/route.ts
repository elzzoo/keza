import { NextRequest, NextResponse } from "next/server";
import { createAlert, getAlertsByEmail } from "@/lib/alerts";

// POST /api/alerts — create a new price alert
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, from, to, cabin, currentPrice } = body;

    if (!email || !from || !to || !currentPrice) {
      return NextResponse.json(
        { error: "Missing required fields: email, from, to, currentPrice" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    // Limit: max 10 active alerts per email
    const existing = await getAlertsByEmail(email);
    if (existing.length >= 10) {
      return NextResponse.json(
        { error: "Maximum 10 active alerts per email" },
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

    return NextResponse.json({ ok: true, alert }, { status: 201 });
  } catch (err) {
    console.error("[api/alerts] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/alerts?email=xxx — list active alerts for an email
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "Missing email param" }, { status: 400 });
  }
  const alerts = await getAlertsByEmail(email);
  return NextResponse.json({ alerts });
}

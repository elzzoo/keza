import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { saveSeatAlert, deleteSeatAlert, SeatAlertSubscription } from "@/lib/seatAlerts";
import { isValidIata, isValidCabin, isValidPrice } from "@/lib/validate";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { route, cabin, minPrice } = await req.json();

  // Validate route (must be valid IATA format like "SIN-LAX")
  if (!route || typeof route !== "string") {
    return NextResponse.json(
      { error: "route must be a non-empty string" },
      { status: 400 }
    );
  }
  const [fromCode, toCode] = route.split("-");
  if (!isValidIata(fromCode) || !isValidIata(toCode)) {
    return NextResponse.json(
      { error: "route must be valid IATA codes (e.g. SIN-LAX)" },
      { status: 400 }
    );
  }

  // Validate cabin (convert to uppercase for CabinType)
  if (!isValidCabin(cabin)) {
    return NextResponse.json(
      { error: "cabin must be economy, premium, business, or first" },
      { status: 400 }
    );
  }
  const cabinMap: Record<string, "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST"> = {
    economy: "ECONOMY",
    premium: "PREMIUM_ECONOMY",
    business: "BUSINESS",
    first: "FIRST",
  };
  const cabinType = cabinMap[cabin.toLowerCase()];

  // Validate minPrice
  if (!isValidPrice(minPrice)) {
    return NextResponse.json(
      { error: "minPrice must be a positive number between 1 and 50000" },
      { status: 400 }
    );
  }

  const alert: SeatAlertSubscription = {
    email: session.user.email,
    route,
    cabin: cabinType,
    minPrice,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  };

  const id = await saveSeatAlert(alert);
  return NextResponse.json({ id, ...alert });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { route, cabin } = await req.json();

  // Validate route and cabin on DELETE as well
  if (!route || typeof route !== "string") {
    return NextResponse.json(
      { error: "route must be a non-empty string" },
      { status: 400 }
    );
  }
  const [fromCode, toCode] = route.split("-");
  if (!isValidIata(fromCode) || !isValidIata(toCode)) {
    return NextResponse.json(
      { error: "route must be valid IATA codes (e.g. SIN-LAX)" },
      { status: 400 }
    );
  }

  if (!isValidCabin(cabin)) {
    return NextResponse.json(
      { error: "cabin must be economy, premium, business, or first" },
      { status: 400 }
    );
  }

  const cabinMap: Record<string, "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST"> = {
    economy: "ECONOMY",
    premium: "PREMIUM_ECONOMY",
    business: "BUSINESS",
    first: "FIRST",
  };
  const cabinType = cabinMap[cabin.toLowerCase()];

  await deleteSeatAlert(session.user.email, route, cabinType);
  return NextResponse.json({ success: true });
}

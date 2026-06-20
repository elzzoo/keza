import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { saveSeatAlert, deleteSeatAlert, SeatAlertSubscription } from "@/lib/seatAlerts";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { route, cabin, minPrice } = await req.json();

  if (!route || !cabin || !minPrice) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const alert: SeatAlertSubscription = {
    email: session.user.email,
    route,
    cabin,
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
  await deleteSeatAlert(session.user.email, route, cabin);
  return NextResponse.json({ success: true });
}

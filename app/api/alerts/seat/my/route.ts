import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getAllAlertsForEmail } from "@/lib/seatAlerts";
import { rateLimitResponse } from "@/lib/ratelimit";

export async function GET(req: Request) {
  const limited = await rateLimitResponse(req, {
    namespace: "api:alerts:seat:my:get",
    limit: 60,
    windowSeconds: 60,
  });
  if (limited) return limited;

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alerts = await getAllAlertsForEmail(session.user.email);
  return NextResponse.json(alerts);
}

import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserCredentials } from "@/lib/portfolio";
import { syncUserBalances } from "@/lib/balanceSync";
import { logError } from "@/lib/logger";
import { checkBalanceSyncLimit } from "@/lib/balanceSyncLimit";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 5 calls/hour per user, 12h cooldown, 20 calls/hour per IP
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const limitCheck = await checkBalanceSyncLimit(session.user.email, ip);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          "Retry-After": (limitCheck.retryAfterSeconds || 3600).toString(),
        }
      }
    );
  }

  try {
    const credentials = await getUserCredentials(session.user.email);
    const results = await syncUserBalances(session.user.email, credentials);
    return NextResponse.json({
      success: true,
      balances: results,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    logError("[api/balance/sync] Failed to sync balances", err, { userEmail: session.user.email });
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}

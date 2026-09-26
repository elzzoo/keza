import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLastSyncTime } from "@/lib/balanceSync";
import { checkBalanceSyncLimit } from "@/lib/balanceSyncLimit";
import { BALANCE_SYNC_NOT_CONFIGURED, isAutomaticBalanceSyncEnabled } from "@/lib/balanceSyncConfig";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAutomaticBalanceSyncEnabled()) {
    return NextResponse.json(BALANCE_SYNC_NOT_CONFIGURED, { status: 501 });
  }

  try {
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

    const lastSync = await getLastSyncTime(session.user.email);
    return NextResponse.json({
      lastSync: lastSync ? lastSync.toISOString() : null,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch sync time" },
      { status: 500 }
    );
  }
}

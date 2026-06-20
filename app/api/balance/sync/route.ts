import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserCredentials } from "@/lib/portfolio";
import { syncUserBalances } from "@/lib/balanceSync";
import { logError } from "@/lib/logger";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

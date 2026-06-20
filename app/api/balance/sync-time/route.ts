import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLastSyncTime } from "@/lib/balanceSync";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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

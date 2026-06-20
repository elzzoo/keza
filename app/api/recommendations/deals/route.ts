import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { safeGet } from "@/lib/redis";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dealsKey = `keza:deals:${session.user.email}`;
  const cached = await safeGet<string>(dealsKey);
  const deals = cached ? JSON.parse(cached) : [];

  return NextResponse.json(deals);
}

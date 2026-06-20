import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { checkProAccess } from "@/lib/proAccess";
import { authOptions } from "@/lib/auth";
import { logError } from "@/lib/logger";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          isPro: false,
          hasTrial: false,
          daysLeft: null,
          isActive: false,
        },
        { status: 200 }
      );
    }

    const status = await checkProAccess(session.user.email);
    return NextResponse.json(status);
  } catch (err) {
    logError("[api/pro/access] Failed to check pro access", err);
    return NextResponse.json(
      {
        isPro: false,
        hasTrial: false,
        daysLeft: null,
        isActive: false,
      },
      { status: 200 }
    );
  }
}

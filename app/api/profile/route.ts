import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getServerProfile, saveServerProfile } from "@/lib/serverProfile";
import type { UserProfile } from "@/lib/userProfile";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getServerProfile(session.user.email);
  return NextResponse.json({ profile });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Partial<UserProfile>;
  try {
    body = await req.json() as Partial<UserProfile>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  await saveServerProfile(session.user.email, body as UserProfile);
  return NextResponse.json({ ok: true });
}

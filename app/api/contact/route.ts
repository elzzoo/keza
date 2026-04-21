import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

interface ContactPayload {
  name: string;
  company: string;
  email: string;
  teamSize: string;
  message?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ContactPayload;

    // Basic validation
    if (!body.name || !body.company || !body.email || !body.teamSize) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const entry = {
      ...body,
      receivedAt: new Date().toISOString(),
    };

    // Store in Redis list — keep last 500 leads
    const key = "keza:b2b:leads";
    await redis.lpush(key, JSON.stringify(entry));
    await redis.ltrim(key, 0, 499);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("[api/contact] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

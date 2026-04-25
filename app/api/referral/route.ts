import { NextRequest, NextResponse } from "next/server";
import { getOrCreateReferralCode, getReferralCredits, getReferralConversions, BASE_URL } from "@/lib/referral";
import { verifyManageAlertsToken } from "@/lib/alertTokens";
import { rateLimitResponse } from "@/lib/ratelimit";
import { isValidEmail } from "@/lib/validate";

// GET /api/referral?email=&token= — return referral link + stats for a user
export async function GET(req: NextRequest) {
  const limited = await rateLimitResponse(req, {
    namespace: "api:referral:get",
    limit: 30,
    windowSeconds: 60,
  });
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  if (!verifyManageAlertsToken(email, token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const [code, credits, conversions] = await Promise.all([
    getOrCreateReferralCode(email),
    getReferralCredits(email),
    getReferralConversions(email),
  ]);

  return NextResponse.json({
    code,
    url: `${BASE_URL}/?ref=${code}`,
    credits,
    conversions,
  });
}

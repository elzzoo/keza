import { NextResponse } from "next/server";
import { AIRPORTS } from "@/data/airports";

// Server-side airport search using the client-side database (410 airports)
// This covers all major hubs worldwide — sufficient for autocomplete fallback

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results = AIRPORTS
    .filter(a => {
      const code = a.code.toLowerCase();
      const city = a.city.toLowerCase();
      const cityEn = a.cityEn.toLowerCase();
      const country = a.country.toLowerCase();
      const countryEn = a.countryEn.toLowerCase();
      return code.startsWith(q) || city.includes(q) || cityEn.includes(q) || country.includes(q) || countryEn.includes(q);
    })
    .slice(0, 15);

  return NextResponse.json({ results }, {
    headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
  });
}

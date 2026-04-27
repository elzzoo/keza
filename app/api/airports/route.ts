import { NextResponse } from "next/server";
import airportsFull from "@/data/airports-full.json";

interface CompactAirport {
  c: string;  // IATA code
  n: string;  // city name
  co: string; // country
  i: string;  // ISO2
  la: number; // latitude
  lo: number; // longitude
}

const allAirports = airportsFull as CompactAirport[];

// Country code → flag emoji
function iso2ToFlag(iso2: string): string {
  if (!iso2 || iso2.length !== 2) return "\u{1F30D}";
  return String.fromCodePoint(
    ...iso2.toUpperCase().split("").map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim().toLowerCase();

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    // Search by IATA code (exact or prefix), city name, or country
    const results = allAirports
      .filter(a => {
        const code = a.c.toLowerCase();
        const city = a.n.toLowerCase();
        const country = a.co.toLowerCase();
        return code.startsWith(q) || city.includes(q) || country.includes(q);
      })
      .slice(0, 15)
      .map(a => ({
        code: a.c,
        city: a.n,
        cityEn: a.n,
        country: a.co,
        countryEn: a.co,
        flag: iso2ToFlag(a.i),
        iso2: a.i,
        lat: a.la,
        lon: a.lo,
      }));

    return NextResponse.json({ results }, {
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
    });
  } catch {
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}

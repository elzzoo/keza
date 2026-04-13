import { NextResponse } from "next/server";
import { searchEngine, type SearchParams } from "@/lib/engine";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Partial<SearchParams>;

    if (!body.from || !body.to || !body.date) {
      return NextResponse.json(
        { error: "Missing required fields: from, to, date" },
        { status: 400 }
      );
    }

    const results = await searchEngine({
      from: body.from,
      to: body.to,
      date: body.date,
      returnDate:   body.returnDate,
      tripType:     body.tripType     ?? "oneway",
      stops:        body.stops        ?? "any",
      cabin:        body.cabin        ?? "economy",
      passengers:   body.passengers   ?? 1,
      userPrograms: body.userPrograms ?? [],
    });

    return NextResponse.json({ results, count: results.length });
  } catch (err) {
    console.error("[api/search] error:", err);
    return NextResponse.json(
      { error: "Search failed", results: [] },
      { status: 500 }
    );
  }
}

import type { SearchParams } from "@/lib/engine";

const IATA_RE = /^[A-Z]{3}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CABINS = ["economy", "premium", "business", "first"] as const;

export type SearchInputResult =
  | { ok: true; params: ValidatedSearchParams }
  | { ok: false; error: string };

export type ValidatedSearchParams = SearchParams &
  Required<Pick<SearchParams, "tripType" | "stops" | "cabin" | "passengers" | "userPrograms">>;

function sanitizeCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const upper = raw.trim().toUpperCase();
  return IATA_RE.test(upper) ? upper : null;
}

function isValidFutureDate(raw: unknown): raw is string {
  if (typeof raw !== "string" || !DATE_RE.test(raw)) return false;
  const d = new Date(raw + "T00:00:00Z");
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const maxDate = new Date(today);
  maxDate.setUTCFullYear(maxDate.getUTCFullYear() + 1);
  return d >= today && d <= maxDate;
}

export function parseSearchParams(body: Partial<SearchParams>): SearchInputResult {
  const from = sanitizeCode(body.from);
  const to = sanitizeCode(body.to);
  const date = isValidFutureDate(body.date) ? body.date : null;

  if (!from || !to || !date) {
    return {
      ok: false,
      error: "Invalid input: from/to must be 3-letter IATA codes, date must be YYYY-MM-DD",
    };
  }

  if (from === to) {
    return { ok: false, error: "Origin and destination must be different" };
  }

  const passengersNum = Number(body.passengers);
  if (
    body.passengers !== undefined &&
    (!Number.isInteger(passengersNum) || passengersNum < 1 || passengersNum > 9)
  ) {
    return {
      ok: false,
      error: "Invalid input: passengers must be an integer between 1 and 9",
    };
  }

  const passengers = Number.isInteger(passengersNum) ? passengersNum : 1;
  const tripType = body.tripType === "roundtrip" ? "roundtrip" : "oneway";
  const returnDate = isValidFutureDate(body.returnDate) ? body.returnDate : undefined;

  if (tripType === "roundtrip" && returnDate && returnDate <= date) {
    return { ok: false, error: "Return date must be after departure date" };
  }

  const cabin: NonNullable<SearchParams["cabin"]> = CABINS.includes(body.cabin as never)
    ? (body.cabin as NonNullable<SearchParams["cabin"]>)
    : "economy";

  return {
    ok: true,
    params: {
      from,
      to,
      date,
      returnDate,
      tripType,
      stops: body.stops === "direct" ? "direct" : "any",
      cabin,
      passengers,
      userPrograms: Array.isArray(body.userPrograms)
        ? body.userPrograms.filter((p): p is string => typeof p === "string").slice(0, 20)
        : [],
    },
  };
}

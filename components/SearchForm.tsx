"use client";

import { useState, useCallback } from "react";
import type { FlightResult } from "@/lib/engine";
import { AirportPicker } from "./AirportPicker";
import clsx from "clsx";

interface SearchFormProps {
  onResults: (results: FlightResult[]) => void;
  onLoading: (loading: boolean) => void;
  lang: "fr" | "en";
}

type TripType = "oneway" | "roundtrip";
type Stops    = "any" | "direct" | "with_stops";
type Cabin    = "economy" | "business" | "first";

const today = new Date().toISOString().split("T")[0]!;
const addDays = (base: string, n: number) => {
  const d = new Date(base + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0]!;
};

const T = {
  fr: {
    tripType:     { round: "Aller-retour", oneway: "Aller simple" },
    from:         "Départ",
    to:           "Destination",
    depDate:      "Date aller",
    retDate:      "Date retour",
    stops:        { label: "Escales", any: "Toutes", direct: "Direct", with_stops: "Avec escale" },
    cabin:        { label: "Classe", economy: "Économique", business: "Business", first: "Première" },
    passengers:   "Passagers",
    programs:     "Programmes miles",
    programsHint: "(optionnel, séparés par virgule)",
    cta:          "Trouver le meilleur vol",
    searching:    "Recherche en cours…",
    error:        "Erreur de recherche",
    adults:       (n: number) => `adulte${n > 1 ? "s" : ""}`,
  },
  en: {
    tripType:     { round: "Round trip", oneway: "One way" },
    from:         "From",
    to:           "To",
    depDate:      "Departure",
    retDate:      "Return",
    stops:        { label: "Stops", any: "Any", direct: "Direct", with_stops: "With stops" },
    cabin:        { label: "Cabin", economy: "Economy", business: "Business", first: "First" },
    passengers:   "Passengers",
    programs:     "Miles programs",
    programsHint: "(optional, comma-separated)",
    cta:          "Find best option",
    searching:    "Searching…",
    error:        "Search error",
    adults:       (n: number) => `adult${n > 1 ? "s" : ""}`,
  },
};

export function SearchForm({ onResults, onLoading, lang }: SearchFormProps) {
  const t = T[lang];
  const [from, setFrom]               = useState("");
  const [to, setTo]                   = useState("");
  const [tripType, setTripType]       = useState<TripType>("roundtrip");
  const [depDate, setDepDate]         = useState(addDays(today, 30));
  const [retDate, setRetDate]         = useState(addDays(today, 37));
  const [stops, setStops]             = useState<Stops>("any");
  const [cabin, setCabin]             = useState<Cabin>("economy");
  const [passengers, setPassengers]   = useState(1);
  const [programs, setPrograms]       = useState("");
  const [error, setError]             = useState<string | null>(null);
  const [submitting, setSubmitting]   = useState(false);

  const canSearch = !!from && !!to && from !== to;

  const handleDepDateChange = (v: string) => {
    setDepDate(v);
    if (retDate <= v) setRetDate(addDays(v, 7));
  };

  const handleSwap = () => { setFrom(to); setTo(from); };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !canSearch) return;
    setError(null);
    setSubmitting(true);
    onLoading(true);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from, to,
          date: depDate,
          returnDate: tripType === "roundtrip" ? retDate : undefined,
          tripType, stops, cabin, passengers,
          userPrograms: programs
            ? programs.split(",").map((p) => p.trim()).filter(Boolean)
            : [],
        }),
      });

      const json = await res.json() as { results: FlightResult[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? t.error);
      onResults(json.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
      onResults([]);
    } finally {
      setSubmitting(false);
      onLoading(false);
    }
  }, [from, to, depDate, retDate, tripType, stops, cabin, passengers, programs,
      submitting, canSearch, onResults, onLoading, t.error]);

  const toggleActive = (active: boolean) => clsx(
    "flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-150",
    active ? "bg-accent text-white shadow-sm shadow-accent/30" : "text-muted hover:text-white"
  );

  const filterActive = (active: boolean) => clsx(
    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all text-left",
    active ? "bg-accent text-white" : "text-muted hover:text-white"
  );

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">

      {/* ── Trip type ─────────────────────────────────── */}
      <div className="flex gap-1 bg-card border border-border rounded-xl p-1">
        <button type="button" onClick={() => setTripType("roundtrip")} className={toggleActive(tripType === "roundtrip")}>
          ⇄ {t.tripType.round}
        </button>
        <button type="button" onClick={() => setTripType("oneway")} className={toggleActive(tripType === "oneway")}>
          → {t.tripType.oneway}
        </button>
      </div>

      {/* ── From / Swap / To ──────────────────────────── */}
      <div className="flex items-end gap-2">
        <div className="flex-1 min-w-0">
          <AirportPicker label={t.from} labelEn="From" value={from} onChange={setFrom} exclude={to} lang={lang} />
        </div>
        <button
          type="button"
          onClick={handleSwap}
          aria-label={lang === "fr" ? "Inverser" : "Swap"}
          className="mb-1 w-9 h-9 flex-shrink-0 rounded-full bg-card border border-border hover:border-accent/40 hover:bg-accent/10 text-muted hover:text-accent flex items-center justify-center transition-all"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <AirportPicker label={t.to} labelEn="To" value={to} onChange={setTo} exclude={from} lang={lang} />
        </div>
      </div>

      {/* ── Dates ─────────────────────────────────────── */}
      <div className={clsx("grid gap-3", tripType === "roundtrip" ? "grid-cols-2" : "grid-cols-1")}>
        <div className="space-y-1.5">
          <label htmlFor="keza-dep" className="text-xs font-semibold text-muted uppercase tracking-wider">{t.depDate}</label>
          <input id="keza-dep" type="date" value={depDate} min={today}
            onChange={(e) => handleDepDateChange(e.target.value)} required
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all [color-scheme:dark]"
          />
        </div>
        {tripType === "roundtrip" && (
          <div className="space-y-1.5">
            <label htmlFor="keza-ret" className="text-xs font-semibold text-muted uppercase tracking-wider">{t.retDate}</label>
            <input id="keza-ret" type="date" value={retDate} min={addDays(depDate, 1)}
              onChange={(e) => setRetDate(e.target.value)} required
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all [color-scheme:dark]"
            />
          </div>
        )}
      </div>

      {/* ── Stops / Cabin / Passengers ────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {/* Stops */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">{t.stops.label}</p>
          <div className="flex flex-col gap-1 bg-card border border-border rounded-xl p-1">
            {(["any", "direct", "with_stops"] as Stops[]).map((s) => (
              <button key={s} type="button" onClick={() => setStops(s)} className={filterActive(stops === s)}>
                {t.stops[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Cabin */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">{t.cabin.label}</p>
          <div className="flex flex-col gap-1 bg-card border border-border rounded-xl p-1">
            {(["economy", "business", "first"] as Cabin[]).map((c) => (
              <button key={c} type="button" onClick={() => setCabin(c)} className={filterActive(cabin === c)}>
                {t.cabin[c]}
              </button>
            ))}
          </div>
        </div>

        {/* Passengers */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">{t.passengers}</p>
          <div className="bg-card border border-border rounded-xl p-2 h-[calc(100%-1.75rem)] flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPassengers((p) => Math.max(1, p - 1))}
                className="w-8 h-8 rounded-lg bg-surface border border-border text-muted hover:text-white hover:border-accent/40 flex items-center justify-center text-xl font-bold transition-all">−</button>
              <span className="text-white font-bold text-2xl tabular-nums w-6 text-center">{passengers}</span>
              <button type="button" onClick={() => setPassengers((p) => Math.min(9, p + 1))}
                className="w-8 h-8 rounded-lg bg-surface border border-border text-muted hover:text-white hover:border-accent/40 flex items-center justify-center text-xl font-bold transition-all">+</button>
            </div>
            <p className="text-xs text-muted">{t.adults(passengers)}</p>
          </div>
        </div>
      </div>

      {/* ── Miles programs ────────────────────────────── */}
      <div className="space-y-1.5">
        <label htmlFor="keza-programs" className="text-xs font-semibold text-muted uppercase tracking-wider">
          {t.programs} <span className="normal-case font-normal text-muted/60">{t.programsHint}</span>
        </label>
        <input id="keza-programs" type="text" value={programs}
          onChange={(e) => setPrograms(e.target.value)}
          placeholder="Air France, Amex MR, Chase UR…"
          className="w-full bg-card border border-border rounded-xl px-4 py-3 text-white placeholder-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
        />
      </div>

      {/* Error */}
      {error && (
        <p role="alert" className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-xl px-4 py-2">
          {error}
        </p>
      )}

      {/* CTA */}
      <button type="submit" disabled={submitting || !canSearch} aria-busy={submitting}
        className={clsx(
          "w-full py-4 rounded-2xl text-white font-bold text-sm transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface",
          submitting || !canSearch
            ? "opacity-50 cursor-not-allowed bg-accent"
            : "bg-accent hover:bg-accent-dim shadow-lg shadow-accent/25 active:scale-[0.98]"
        )}
      >
        {submitting ? `⏳ ${t.searching}` : `🔍 ${t.cta}`}
      </button>
    </form>
  );
}

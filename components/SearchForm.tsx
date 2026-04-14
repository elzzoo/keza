"use client";

import { useState, useCallback } from "react";
import type { FlightResult } from "@/lib/engine";
import { AirportPicker } from "./AirportPicker";
import clsx from "clsx";

interface Props {
  onResults: (r: FlightResult[]) => void;
  onLoading: (l: boolean) => void;
  lang: "fr" | "en";
}

type TripType = "oneway" | "roundtrip";
type Stops    = "any" | "direct" | "with_stops";
type Cabin    = "economy" | "business" | "first";

const today   = new Date().toISOString().split("T")[0]!;
const addDays = (base: string, n: number) => {
  const d = new Date(base + "T12:00:00"); d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0]!;
};

const L = {
  fr: {
    round: "Aller-retour", one: "Aller simple",
    from: "Départ", to: "Destination",
    dep: "Date aller", ret: "Date retour",
    stops: { label: "Escales", any: "Toutes", direct: "Direct", with_stops: "Avec escales" },
    cabin: { label: "Classe", economy: "Économique", business: "Business", first: "Première" },
    pax: "Passagers", adult: (n: number) => `adulte${n > 1 ? "s" : ""}`,
    programs: "Programmes miles", ph: "Flying Blue, Chase UR, Amex MR…", hint: "optionnel",
    cta: "Trouver le meilleur vol", loading: "Recherche en cours…", err: "Erreur de recherche",
  },
  en: {
    round: "Round trip", one: "One way",
    from: "From", to: "To",
    dep: "Departure date", ret: "Return date",
    stops: { label: "Stops", any: "Any", direct: "Direct", with_stops: "With stops" },
    cabin: { label: "Cabin", economy: "Economy", business: "Business", first: "First" },
    pax: "Passengers", adult: (n: number) => `adult${n > 1 ? "s" : ""}`,
    programs: "Miles programs", ph: "Flying Blue, Chase UR, Amex MR…", hint: "optional",
    cta: "Find best option", loading: "Searching…", err: "Search error",
  },
};

export function SearchForm({ onResults, onLoading, lang }: Props) {
  const t = L[lang];
  const [from,       setFrom]       = useState("");
  const [to,         setTo]         = useState("");
  const [tripType,   setTripType]   = useState<TripType>("roundtrip");
  const [depDate,    setDepDate]    = useState(addDays(today, 30));
  const [retDate,    setRetDate]    = useState(addDays(today, 37));
  const [stops,      setStops]      = useState<Stops>("any");
  const [cabin,      setCabin]      = useState<Cabin>("economy");
  const [passengers, setPassengers] = useState(1);
  const [programs,   setPrograms]   = useState("");
  const [error,      setError]      = useState<string | null>(null);
  const [busy,       setBusy]       = useState(false);

  const canGo = !!from && !!to && from !== to;
  const onDep = (v: string) => { setDepDate(v); if (retDate <= v) setRetDate(addDays(v, 7)); };

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !canGo) return;
    setError(null); setBusy(true); onLoading(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from, to, date: depDate,
          returnDate: tripType === "roundtrip" ? retDate : undefined,
          tripType, stops, cabin, passengers,
          userPrograms: programs ? programs.split(",").map(p => p.trim()).filter(Boolean) : [],
        }),
      });
      const json = await res.json() as { results: FlightResult[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? t.err);
      onResults(json.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.err);
      onResults([]);
    } finally { setBusy(false); onLoading(false); }
  }, [from, to, depDate, retDate, tripType, stops, cabin, passengers, programs, busy, canGo, onResults, onLoading, t.err]);

  const tripBtn = (active: boolean) => clsx(
    "flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-1.5",
    active
      ? "bg-white text-primary shadow-sm border border-slate-200"
      : "text-muted hover:text-fg"
  );
  const chip = (active: boolean) => clsx(
    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 text-left",
    active ? "bg-primary/10 text-primary" : "text-muted hover:text-fg hover:bg-slate-50"
  );

  return (
    <form onSubmit={submit}>
      <div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,.10)] p-5 space-y-4">

        {/* Trip type toggle */}
        <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
          <button type="button" onClick={() => setTripType("roundtrip")} className={tripBtn(tripType === "roundtrip")}>
            <span>⇄</span>{t.round}
          </button>
          <button type="button" onClick={() => setTripType("oneway")} className={tripBtn(tripType === "oneway")}>
            <span>→</span>{t.one}
          </button>
        </div>

        {/* From / Swap / To */}
        <div className="flex items-end gap-2">
          <div className="flex-1 min-w-0">
            <AirportPicker label={t.from} labelEn="From" value={from} onChange={setFrom} exclude={to} lang={lang} />
          </div>
          <button
            type="button"
            onClick={() => { setFrom(to); setTo(from); }}
            aria-label={lang === "fr" ? "Inverser" : "Swap"}
            className="mb-1 w-9 h-9 flex-shrink-0 rounded-full border border-slate-200 bg-white text-muted hover:text-primary hover:border-primary/40 hover:bg-blue-50 flex items-center justify-center transition-all shadow-sm"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v14M17 12.5 12.5 17m0 0L8 12.5M12.5 17V3" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <AirportPicker label={t.to} labelEn="To" value={to} onChange={setTo} exclude={from} lang={lang} />
          </div>
        </div>

        {/* Dates */}
        <div className={clsx("grid gap-3", tripType === "roundtrip" ? "grid-cols-2" : "grid-cols-1")}>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted uppercase tracking-widest">{t.dep}</label>
            <input type="date" value={depDate} min={today} onChange={e => onDep(e.target.value)} required
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-fg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all [color-scheme:light]" />
          </div>
          {tripType === "roundtrip" && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest">{t.ret}</label>
              <input type="date" value={retDate} min={addDays(depDate, 1)} onChange={e => setRetDate(e.target.value)} required
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-fg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all [color-scheme:light]" />
            </div>
          )}
        </div>

        {/* Filters row */}
        <div className="grid grid-cols-3 gap-3">
          {/* Stops */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{t.stops.label}</p>
            <div className="bg-white border border-slate-200 rounded-xl p-1 flex flex-col gap-0.5">
              {(["any", "direct", "with_stops"] as Stops[]).map(s => (
                <button key={s} type="button" onClick={() => setStops(s)} className={chip(stops === s)}>
                  {t.stops[s]}
                </button>
              ))}
            </div>
          </div>
          {/* Cabin */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{t.cabin.label}</p>
            <div className="bg-white border border-slate-200 rounded-xl p-1 flex flex-col gap-0.5">
              {(["economy", "business", "first"] as Cabin[]).map(c => (
                <button key={c} type="button" onClick={() => setCabin(c)} className={chip(cabin === c)}>
                  {t.cabin[c]}
                </button>
              ))}
            </div>
          </div>
          {/* Passengers */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{t.pax}</p>
            <div className="bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1.5 py-3 h-[calc(100%-1.5rem)]">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setPassengers(p => Math.max(1, p - 1))}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-muted hover:text-fg hover:border-primary/40 flex items-center justify-center text-base font-bold transition-all shadow-sm">−</button>
                <span className="text-2xl font-black text-fg tabular-nums w-6 text-center">{passengers}</span>
                <button type="button" onClick={() => setPassengers(p => Math.min(9, p + 1))}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-muted hover:text-fg hover:border-primary/40 flex items-center justify-center text-base font-bold transition-all shadow-sm">+</button>
              </div>
              <p className="text-[10px] text-muted">{t.adult(passengers)}</p>
            </div>
          </div>
        </div>

        {/* Miles programs */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted uppercase tracking-widest flex items-center gap-2">
            {t.programs}
            <span className="font-normal normal-case text-muted/60">— {t.hint}</span>
          </label>
          <input
            type="text" value={programs} onChange={e => setPrograms(e.target.value)}
            placeholder={t.ph}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-fg placeholder-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="text-danger-text text-sm bg-danger-dim border border-danger/20 rounded-xl px-4 py-3 flex items-center gap-2">
            <span>⚠️</span>{error}
          </div>
        )}

        {/* CTA */}
        <button
          type="submit"
          disabled={busy || !canGo}
          className={clsx(
            "w-full py-3.5 rounded-2xl text-white font-semibold text-sm tracking-wide transition-all duration-150",
            busy || !canGo
              ? "opacity-50 cursor-not-allowed bg-primary"
              : "bg-primary hover:bg-primary-hover active:scale-[0.99] shadow-blue"
          )}
        >
          {busy ? `⏳ ${t.loading}` : `🔍  ${t.cta}`}
        </button>
      </div>
    </form>
  );
}

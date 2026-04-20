"use client";

import { useState, useCallback, useEffect } from "react";
import type { FlightResult } from "@/lib/engine";
import { AirportPicker } from "./AirportPicker";
import { PriceCalendar } from "./PriceCalendar";
import clsx from "clsx";

interface Props {
  onResults: (r: FlightResult[]) => void;
  onLoading: (l: boolean) => void;
  onSearchStart?: (params: {from:string;to:string;date:string;cabin:string;tripType:"oneway"|"roundtrip"}) => void;
  lang: "fr" | "en";
  initialFrom?: string;
  initialTo?: string;
  savedPrograms?: string[];
  savedCabin?: "economy" | "premium" | "business" | "first";
}

type TripType = "oneway" | "roundtrip";
type Cabin    = "economy" | "premium" | "business" | "first";

const today   = new Date().toISOString().split("T")[0]!;
const addDays = (base: string, n: number) => {
  const d = new Date(base + "T12:00:00"); d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0]!;
};

export function SearchForm({ onResults, onLoading, onSearchStart, lang, initialFrom, initialTo, savedPrograms, savedCabin }: Props) {
  const [from,       setFrom]       = useState(initialFrom ?? "");
  const [to,         setTo]         = useState(initialTo ?? "");
  const [tripType,   setTripType]   = useState<TripType>("roundtrip");
  const [depDate,    setDepDate]    = useState(addDays(today, 30));
  const [retDate,    setRetDate]    = useState(addDays(today, 37));
  const [cabin,      setCabin]      = useState<Cabin>("economy");
  const [passengers, setPassengers] = useState(1);
  const [programs,   setPrograms]   = useState("");
  const [error,      setError]      = useState<string | null>(null);
  const [busy,       setBusy]       = useState(false);
  const [showCalendar, setShowCalendar] = useState<"dep" | "ret" | null>(null);

  // React to external route selection (popular routes)
  useEffect(() => { if (initialFrom) setFrom(initialFrom); }, [initialFrom]);
  useEffect(() => { if (initialTo) setTo(initialTo); }, [initialTo]);

  // Restore saved programs & cabin from profile (once on mount)
  const [profileLoaded, setProfileLoaded] = useState(false);
  useEffect(() => {
    if (profileLoaded) return;
    if (savedPrograms?.length) { setPrograms(savedPrograms.join(", ")); setProfileLoaded(true); }
    if (savedCabin) { setCabin(savedCabin); setProfileLoaded(true); }
  }, [savedPrograms, savedCabin, profileLoaded]);

  const canGo = !!from && !!to && from !== to;
  const onDep = (v: string) => { setDepDate(v); if (retDate <= v) setRetDate(addDays(v, 7)); };

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !canGo) return;
    setError(null); setBusy(true); onLoading(true);
    setShowCalendar(null); // close calendar on search
    onSearchStart?.({ from, to, date: depDate, cabin, tripType });
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from, to, date: depDate,
          returnDate: tripType === "roundtrip" ? retDate : undefined,
          tripType, cabin, passengers,
          userPrograms: programs ? programs.split(",").map(p => p.trim()).filter(Boolean) : [],
        }),
      });
      const json = await res.json() as { results: FlightResult[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? (lang === "fr" ? "Erreur de recherche" : "Search error"));
      onResults(json.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : (lang === "fr" ? "Erreur de recherche" : "Search error"));
      onResults([]);
    } finally { setBusy(false); onLoading(false); }
  }, [from, to, depDate, retDate, tripType, cabin, passengers, programs, busy, canGo, onResults, onLoading, onSearchStart, lang]);

  const fr = lang === "fr";

  // Trip toggle pill
  const tripBtn = (active: boolean) => clsx(
    "flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-150",
    active ? "bg-surface-2 text-fg shadow-sm border border-border" : "text-muted hover:text-fg"
  );

  // Cabin pill
  const cabinBtn = (active: boolean) => clsx(
    "flex-1 py-2 rounded-xl font-semibold text-sm border transition-all duration-150",
    active
      ? "bg-primary/15 border-primary/30 text-blue-400"
      : "bg-surface-2 border-border text-muted hover:border-subtle hover:text-fg"
  );

  // Can we show calendar? Need both airports
  const canShowCalendar = !!from && !!to && from !== to;

  return (
    <form onSubmit={submit}>
      <div className="bg-surface rounded-3xl border border-border p-5 space-y-4 shadow-card">

        {/* Trip type toggle */}
        <div className="flex gap-1 bg-bg rounded-2xl p-1 border border-border">
          <button type="button" onClick={() => setTripType("roundtrip")} className={tripBtn(tripType === "roundtrip")}>
            {fr ? "Aller-retour" : "Round trip"}
          </button>
          <button type="button" onClick={() => setTripType("oneway")} className={tripBtn(tripType === "oneway")}>
            {fr ? "Aller simple" : "One way"}
          </button>
        </div>

        {/* From / Swap / To */}
        <div className="flex items-end gap-2">
          <div className="flex-1 min-w-0">
            <AirportPicker
              label={fr ? "Départ" : "From"} labelEn="From"
              value={from} onChange={setFrom} exclude={to} lang={lang}
            />
          </div>
          <button
            type="button"
            onClick={() => { setFrom(to); setTo(from); }}
            aria-label={fr ? "Inverser" : "Swap"}
            className="mb-1 w-9 h-9 rounded-full bg-surface-2 border border-border hover:bg-primary/15 hover:text-primary hover:border-primary/30 text-muted flex items-center justify-center transition-all flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <AirportPicker
              label={fr ? "Destination" : "To"} labelEn="To"
              value={to} onChange={setTo} exclude={from} lang={lang}
            />
          </div>
        </div>

        {/* Dates */}
        <div className={clsx("grid gap-3", tripType === "roundtrip" ? "grid-cols-2" : "grid-cols-1")}>
          {/* Departure date */}
          <div>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5">
              {fr ? "Date aller" : "Departure"}
            </p>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => (document.getElementById("keza-dep") as HTMLInputElement)?.showPicker?.()}
                className="flex-1 flex items-center gap-2.5 bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-fg hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 text-muted flex-shrink-0">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span className="font-medium">
                  {new Date(depDate + "T12:00:00").toLocaleDateString(fr ? "fr-FR" : "en-US", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
                <input id="keza-dep" type="date" value={depDate} min={today}
                  onChange={e => onDep(e.target.value)}
                  className="sr-only" tabIndex={-1} />
              </button>
              {/* Calendar toggle */}
              {canShowCalendar && (
                <button
                  type="button"
                  onClick={() => setShowCalendar(showCalendar === "dep" ? null : "dep")}
                  title={fr ? "Voir les prix par jour" : "View prices by day"}
                  className={clsx(
                    "w-10 flex items-center justify-center rounded-xl border transition-all",
                    showCalendar === "dep"
                      ? "bg-primary/15 border-primary/30 text-primary"
                      : "bg-surface-2 border-border text-muted hover:border-primary/30 hover:text-primary"
                  )}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <line x1="9" y1="4" x2="9" y2="20" />
                    <line x1="15" y1="4" x2="15" y2="20" />
                    <line x1="3" y1="15" x2="21" y2="15" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Return date */}
          {tripType === "roundtrip" && (
            <div>
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5">
                {fr ? "Date retour" : "Return"}
              </p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => (document.getElementById("keza-ret") as HTMLInputElement)?.showPicker?.()}
                  className="flex-1 flex items-center gap-2.5 bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-fg hover:border-primary/40 hover:bg-primary/5 transition-all"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 text-muted flex-shrink-0">
                    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span className="font-medium">
                    {new Date(retDate + "T12:00:00").toLocaleDateString(fr ? "fr-FR" : "en-US", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                  <input id="keza-ret" type="date" value={retDate} min={addDays(depDate, 1)}
                    onChange={e => setRetDate(e.target.value)}
                    className="sr-only" tabIndex={-1} />
                </button>
                {/* Calendar toggle for return */}
                {canShowCalendar && (
                  <button
                    type="button"
                    onClick={() => setShowCalendar(showCalendar === "ret" ? null : "ret")}
                    title={fr ? "Voir les prix par jour" : "View prices by day"}
                    className={clsx(
                      "w-10 flex items-center justify-center rounded-xl border transition-all",
                      showCalendar === "ret"
                        ? "bg-primary/15 border-primary/30 text-primary"
                        : "bg-surface-2 border-border text-muted hover:border-primary/30 hover:text-primary"
                    )}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                      <line x1="9" y1="4" x2="9" y2="20" />
                      <line x1="15" y1="4" x2="15" y2="20" />
                      <line x1="3" y1="15" x2="21" y2="15" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Price Calendar (departure) */}
        {showCalendar === "dep" && canShowCalendar && (
          <PriceCalendar
            from={from}
            to={to}
            selectedDate={depDate}
            onSelectDate={(d) => { onDep(d); setShowCalendar(null); }}
            lang={lang}
            cabin={cabin}
          />
        )}

        {/* Price Calendar (return) */}
        {showCalendar === "ret" && canShowCalendar && tripType === "roundtrip" && (
          <PriceCalendar
            from={to}
            to={from}
            selectedDate={retDate}
            onSelectDate={(d) => { setRetDate(d); setShowCalendar(null); }}
            lang={lang}
            cabin={cabin}
          />
        )}

        {/* Cabin + Passengers */}
        <div className="flex gap-3">
          <div className="flex-1">
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5">
              {fr ? "Classe" : "Cabin"}
            </p>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => setCabin("economy")} className={cabinBtn(cabin === "economy")}>
                {fr ? "Éco" : "Eco"}
              </button>
              <button type="button" onClick={() => setCabin("premium")} className={cabinBtn(cabin === "premium")}>
                Prem
              </button>
              <button type="button" onClick={() => setCabin("business")} className={cabinBtn(cabin === "business")}>
                Biz
              </button>
              <button type="button" onClick={() => setCabin("first")} className={cabinBtn(cabin === "first")}>
                First
              </button>
            </div>
          </div>

          <div className="w-32">
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5">
              {fr ? "Passagers" : "Passengers"}
            </p>
            <div className="flex items-center justify-between bg-surface-2 border border-border rounded-xl px-3 py-2.5 h-[42px]">
              <button
                type="button"
                onClick={() => setPassengers(p => Math.max(1, p - 1))}
                className="w-6 h-6 rounded-lg bg-border hover:bg-primary/20 hover:text-primary text-muted flex items-center justify-center text-sm font-bold transition-all"
              >−</button>
              <span className="text-sm font-bold text-fg tabular-nums">{passengers} pax</span>
              <button
                type="button"
                onClick={() => setPassengers(p => Math.min(9, p + 1))}
                className="w-6 h-6 rounded-lg bg-border hover:bg-primary/20 hover:text-primary text-muted flex items-center justify-center text-sm font-bold transition-all"
              >+</button>
            </div>
          </div>
        </div>

        {/* Miles programs */}
        <div>
          <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5 flex items-center gap-2">
            {fr ? "Programmes miles" : "Miles programs"}
            <span className="font-normal normal-case text-subtle tracking-normal">— {fr ? "optionnel" : "optional"}</span>
          </label>
          <input
            type="text" value={programs} onChange={e => setPrograms(e.target.value)}
            placeholder="Flying Blue, Chase UR, Amex MR…"
            className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-fg placeholder-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all"
          />
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="text-danger/90 text-sm bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 flex items-center gap-2">
            <span>⚠️</span>{error}
          </div>
        )}

        {/* CTA */}
        <button
          type="submit"
          disabled={busy || !canGo}
          className={clsx(
            "w-full py-3.5 rounded-2xl text-white font-semibold text-sm transition-all duration-150",
            busy || !canGo
              ? "opacity-40 cursor-not-allowed bg-primary"
              : "bg-primary hover:bg-primary-hover active:scale-[0.99] shadow-blue"
          )}
        >
          {busy
            ? <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                {fr ? "Recherche en cours…" : "Searching…"}
              </span>
            : `✦  ${fr ? "Optimiser mon vol" : "Optimize my flight"}`
          }
        </button>
      </div>
    </form>
  );
}

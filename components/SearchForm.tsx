"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { FlightResult } from "@/lib/engine";
import { AirportPicker } from "./AirportPicker";
import { ProgramsPicker } from "./ProgramsPicker";
import { PriceCalendar } from "./PriceCalendar";
import { OnboardingFlow } from "./onboarding/OnboardingFlow";
import { getVisitedFlag } from "@/lib/storage";
import { useOnboarding } from "@/lib/contexts/onboardingContext";
import { trackSearch } from "@/lib/analytics";
import { toast } from "sonner";
import clsx from "clsx";

interface Props {
  onResults: (r: FlightResult[], partial?: boolean) => void;
  onLoading: (l: boolean) => void;
  onSearchStart?: (params: {from:string;to:string;date:string;cabin:string;tripType:"oneway"|"roundtrip"}) => void;
  lang: "fr" | "en";
  initialFrom?: string;
  initialTo?: string;
  savedPrograms?: string[];
  /** Cabin from user profile (applied once, user changes override) */
  savedCabin?: "economy" | "premium" | "business" | "first";
  /** Cabin from URL params — takes priority over savedCabin */
  initialCabin?: "economy" | "premium" | "business" | "first";
  /** Format a USD amount into user's chosen currency */
  formatPrice?: (usd: number) => string;
  /** Pre-fill from shared URL */
  initialDate?: string;
  initialTripType?: "oneway" | "roundtrip";
  initialPax?: number;
  /** Called with true while streaming partial results, false when final results arrive */
  onLiveRefreshing?: (v: boolean) => void;
}

type TripType = "oneway" | "roundtrip";
type Cabin    = "economy" | "premium" | "business" | "first";

const today   = new Date().toISOString().split("T")[0]!;
const addDays = (base: string, n: number) => {
  const d = new Date(base + "T12:00:00"); d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0]!;
};

/**
 * Main flight search form. Handles trip type (oneway/roundtrip), date selection,
 * cabin choice, passenger count, and airlines/programs filtering. Streams results
 * as they arrive via SSE, with cabin auto-refire on user change after first search.
 *
 * @param Props - SearchForm props including initial values, callbacks, and formatting function
 */
export function SearchForm({ onResults, onLoading, onSearchStart, lang, initialFrom, initialTo, savedPrograms, savedCabin, initialCabin, formatPrice, initialDate, initialTripType, initialPax, onLiveRefreshing }: Props) {
  const enableOnboarding = process.env.NEXT_PUBLIC_ENABLE_ONBOARDING === "true";
  const [from,       setFrom]       = useState(initialFrom ?? "");
  const [to,         setTo]         = useState(initialTo ?? "");
  const [tripType,   setTripType]   = useState<TripType>(initialTripType ?? "roundtrip");
  const [depDate,    setDepDate]    = useState(initialDate ?? addDays(today, 30));
  const [retDate,    setRetDate]    = useState(initialDate ? addDays(initialDate, 7) : addDays(today, 37));
  const [cabin,      setCabin]      = useState<Cabin>("economy");
  const [passengers, setPassengers] = useState(initialPax ?? 1);
  const [programs,   setPrograms]   = useState("");
  const [error,      setError]      = useState<string | null>(null);
  const [busy,       setBusy]       = useState(false);
  const [showCalendar, setShowCalendar] = useState<"dep" | "ret" | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { state: onboardingState } = useOnboarding();

  // React to external route selection (popular routes / URL params)
  useEffect(() => { if (initialFrom) setFrom(initialFrom); }, [initialFrom]);
  useEffect(() => { if (initialTo)   setTo(initialTo);     }, [initialTo]);

  // URL param prefill — date, tripType, pax.
  // These only run once (guard prevents overwriting user changes).
  const [urlParamApplied, setUrlParamApplied] = useState(false);
  useEffect(() => {
    if (urlParamApplied) return;
    let applied = false;
    if (initialDate)    { setDepDate(initialDate); setRetDate(addDays(initialDate, 7)); applied = true; }
    if (initialTripType){ setTripType(initialTripType); applied = true; }
    if (initialPax)     { setPassengers(initialPax); applied = true; }
    if (applied) setUrlParamApplied(true);
  }, [initialDate, initialTripType, initialPax, urlParamApplied]);

  // URL cabin param — always beats profile cabin.
  const [urlCabinApplied, setUrlCabinApplied] = useState(false);
  useEffect(() => {
    if (urlCabinApplied || !initialCabin) return;
    setCabin(initialCabin);
    setUrlCabinApplied(true);
  }, [initialCabin, urlCabinApplied]);

  // Restore saved programs & cabin from profile (once on mount, only if no URL cabin).
  const [profileLoaded, setProfileLoaded] = useState(false);
  useEffect(() => {
    if (profileLoaded) return;
    if (savedPrograms?.length) { setPrograms(savedPrograms.join(", ")); setProfileLoaded(true); }
    // Profile cabin only applies if URL didn't supply one
    if (savedCabin && !initialCabin) { setCabin(savedCabin); setProfileLoaded(true); }
  }, [savedPrograms, savedCabin, initialCabin, profileLoaded]);

  // Show onboarding modal to first-time visitors
  useEffect(() => {
    if (typeof window !== "undefined" && !getVisitedFlag()) {
      setShowOnboarding(true);
    }
  }, []);

  // Pre-fill programs from onboarding state
  useEffect(() => {
    if (onboardingState.selectedPrograms.length > 0 && !programs) {
      setPrograms(onboardingState.selectedPrograms.join(", "));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingState.selectedPrograms, programs]);

  // Pre-fill routes from onboarding state
  useEffect(() => {
    if (onboardingState.favoriteRoutes.length > 0 && !from && !to) {
      const [fromAirport, toAirport] = onboardingState.favoriteRoutes[0];
      setFrom(fromAirport);
      setTo(toAirport);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingState.favoriteRoutes, from, to]);

  const canGo = !!from && !!to && from !== to;
  const onDep = (v: string) => { setDepDate(v); if (retDate <= v) setRetDate(addDays(v, 7)); };

  // ── Track whether the user has performed at least one search ────────────────
  const hasSearchedRef = useRef(false);

  // ── Core fetch logic — takes explicit cabin so it works from both submit
  //    handler and the cabin-change auto-refire effect ─────────────────────────
  const fetchResults = useCallback(async (searchCabin: Cabin) => {
    setError(null); setBusy(true); onLoading(true);
    setShowCalendar(null);
    onSearchStart?.({ from, to, date: depDate, cabin: searchCabin, tripType });
    trackSearch({ from, to, cabin: searchCabin, tripType, pax: passengers });

    // Hard abort after 14s — ensures UI never hangs even if stream stalls
    const CLIENT_TIMEOUT_MS = 14_000;
    const controller = new AbortController();
    const clientTimer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

    const requestBody = JSON.stringify({
      from, to, date: depDate,
      returnDate: tripType === "roundtrip" ? retDate : undefined,
      tripType, cabin: searchCabin, passengers,
      userPrograms: programs ? programs.split(",").map(p => p.trim()).filter(Boolean) : [],
    });

    let partialReceived = false;

    try {
      const res = await fetch("/api/search/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        // Non-200 or no body — fall through to JSON error handling
        const json = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(json.error ?? (lang === "fr" ? "Erreur de recherche" : "Search error"));
      }

      // ── Consume SSE stream ──────────────────────────────────────────────────
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by double newlines
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? ""; // keep incomplete trailing chunk

        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) continue;
          let event: { type: string; results?: FlightResult[]; forexRate?: number; message?: string };
          try { event = JSON.parse(chunk.slice(6)); } catch { continue; }

          if (event.type === "partial" && event.results && event.results.length > 0) {
            partialReceived = true;
            // Show Duffel results immediately — hide the loading spinner
            onLoading(false);
            setBusy(false);
            onResults(event.results, false);
            // Signal parent that final results are still incoming
            onLiveRefreshing?.(true);

          } else if (event.type === "final" && event.results) {
            // Merge in full Duffel+TP results — update silently (no loader)
            onLiveRefreshing?.(false);
            onResults(event.results, false);

          } else if (event.type === "error") {
            // Server error after stream started — if we already have partial, keep them
            if (!partialReceived) {
              throw new Error(event.message ?? (lang === "fr" ? "Erreur de recherche" : "Search error"));
            } else {
              onLiveRefreshing?.(false);
            }
          }
        }
      }
      clearTimeout(clientTimer);

      // If we never got any results (e.g. cache miss + both providers returned empty)
      // the Results component handles the empty state gracefully.
      if (!partialReceived) {
        // Final event never came through — mark loading done
        onLoading(false);
      }

    } catch (err) {
      clearTimeout(clientTimer);
      onLiveRefreshing?.(false);
      const isAbort = (err as Error).name === "AbortError";
      if (isAbort) {
        if (!partialReceived) {
          const msg = lang === "fr"
            ? "⚠️ Résultats partiels affichés — certaines sources indisponibles"
            : "⚠️ Partial results — some sources unavailable";
          toast.warning(msg, { duration: 6000 });
        }
        // If partial was received, we already showed results — just stop quietly
      } else {
        const msg = err instanceof Error ? err.message : (lang === "fr" ? "Erreur de recherche" : "Search error");
        setError(msg);
        toast.error(msg);
      }
    } finally {
      setBusy(false);
      onLoading(false);
    }
  }, [from, to, depDate, retDate, tripType, passengers, programs, onResults, onLoading, onSearchStart, onLiveRefreshing, lang]);

  // Keep a stable ref so the cabin-change effect always calls the latest version
  const fetchResultsRef = useRef(fetchResults);
  useEffect(() => { fetchResultsRef.current = fetchResults; }, [fetchResults]);

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !canGo) return;
    hasSearchedRef.current = true;
    await fetchResults(cabin);
  }, [fetchResults, busy, canGo, cabin]);

  // ── Auto-refire when cabin changes — only if the user already ran a search ──
  // Using a ref for the previous cabin to skip the initial mount.
  const prevCabinRef = useRef<Cabin | null>(null);
  useEffect(() => {
    // Skip first render (prevCabinRef is null on mount)
    if (prevCabinRef.current === null) { prevCabinRef.current = cabin; return; }
    if (prevCabinRef.current === cabin) return;
    prevCabinRef.current = cabin;
    if (!hasSearchedRef.current || !canGo) return;
    fetchResultsRef.current(cabin);
  }, [cabin, canGo]);

  const fr = lang === "fr";

  // Trip toggle pill
  const tripBtn = (active: boolean) => clsx(
    "flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-150",
    active ? "bg-surface-2 text-fg shadow-sm border border-border" : "text-muted hover:text-fg"
  );

  // Cabin pill — py-3 ensures 44px minimum touch target on mobile
  const cabinBtn = (active: boolean) => clsx(
    "flex-1 py-3 rounded-xl font-semibold text-sm border transition-all duration-150",
    active
      ? "bg-primary/15 border-primary/30 text-blue-400"
      : "bg-surface-2 border-border text-muted hover:border-subtle hover:text-fg"
  );

  // Can we show calendar? Need both airports
  const canShowCalendar = !!from && !!to && from !== to;

  return (
    <>
      {enableOnboarding && showOnboarding && (
        <OnboardingFlow onComplete={() => setShowOnboarding(false)} />
      )}
      <form onSubmit={submit}>
        <div className="bg-surface rounded-3xl border border-border p-4 sm:p-5 space-y-3 sm:space-y-4 shadow-card">

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
        <div className={clsx("grid gap-2 sm:gap-3", tripType === "roundtrip" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
          {/* Departure date */}
          <div>
            <label htmlFor="keza-dep-date" className="text-[11px] sm:text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5 block">
              {fr ? "Date aller" : "Departure"}
            </label>
            <div className="flex gap-1.5">
              {/* The date input is overlaid transparently over the button so the
                  native date picker opens on click — this works cross-browser,
                  including iOS Safari which doesn't support showPicker(). */}
              <div className="relative flex-1 cursor-pointer">
                <div className="flex items-center gap-2.5 bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-fg pointer-events-none">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 text-muted flex-shrink-0">
                    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span className="font-medium">
                    {new Date(depDate + "T12:00:00").toLocaleDateString(fr ? "fr-FR" : "en-US", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>
                <input id="keza-dep-date" type="date" value={depDate} min={today}
                  onChange={e => onDep(e.target.value)}
                  className="absolute inset-0 opacity-0 w-full cursor-pointer"
                />
              </div>
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
              <label htmlFor="keza-ret-date" className="text-[11px] sm:text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5 block">
                {fr ? "Date retour" : "Return"}
              </label>
              <div className="flex gap-1.5">
                <div className="relative flex-1 cursor-pointer">
                  <div className="flex items-center gap-2.5 bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-fg pointer-events-none">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 text-muted flex-shrink-0">
                      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span className="font-medium">
                      {new Date(retDate + "T12:00:00").toLocaleDateString(fr ? "fr-FR" : "en-US", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <input id="keza-ret-date" type="date" value={retDate} min={addDays(depDate, 1)}
                    onChange={e => setRetDate(e.target.value)}
                    className="absolute inset-0 opacity-0 w-full cursor-pointer"
                  />
                </div>
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
            formatPrice={formatPrice}
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
            formatPrice={formatPrice}
          />
        )}

        {/* Cabin + Passengers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3">
          <div>
            <p id="keza-cabin-label" className="text-[11px] sm:text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5">
              {fr ? "Classe" : "Cabin"}
            </p>
            <div className="flex gap-1.5 flex-wrap sm:flex-nowrap" role="group" aria-labelledby="keza-cabin-label">
              <button type="button" onClick={() => setCabin("economy")} aria-pressed={cabin === "economy"} className={cabinBtn(cabin === "economy")}>
                {fr ? "Éco" : "Eco"}
              </button>
              <button type="button" onClick={() => setCabin("premium")} aria-pressed={cabin === "premium"} className={cabinBtn(cabin === "premium")}>
                {fr ? "Prem" : "Prem"}
              </button>
              <button type="button" onClick={() => setCabin("business")} aria-pressed={cabin === "business"} className={cabinBtn(cabin === "business")}>
                {fr ? "Bus." : "Bus."}
              </button>
              <button type="button" onClick={() => setCabin("first")} aria-pressed={cabin === "first"} className={cabinBtn(cabin === "first")}>
                {fr ? "1ère" : "1st"}
              </button>
            </div>
          </div>

          <div>
            <p id="keza-pax-label" className="text-[11px] sm:text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5">
              {fr ? "Passagers" : "Passengers"}
            </p>
            <div className="flex items-center justify-between bg-surface-2 border border-border rounded-xl px-3 py-2.5 h-[42px]">
              {/* Minimum 44×44px touch target per iOS/Android guidelines */}
              <button
                type="button"
                aria-label={fr ? "Moins de passagers" : "Fewer passengers"}
                onClick={() => setPassengers(p => Math.max(1, p - 1))}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-border hover:bg-primary/20 hover:text-primary text-muted text-sm font-bold transition-all"
              >−</button>
              <span className="text-sm font-bold text-fg tabular-nums">
                {passengers} {fr ? "pass." : "pax"}
              </span>
              <button
                type="button"
                aria-label={fr ? "Plus de passagers" : "More passengers"}
                onClick={() => setPassengers(p => Math.min(9, p + 1))}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-border hover:bg-primary/20 hover:text-primary text-muted text-sm font-bold transition-all"
              >+</button>
            </div>
          </div>
        </div>

        {/* Miles programs */}
        <div>
          <label className="text-[11px] sm:text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5 flex items-center gap-2">
            {fr ? "Programmes miles" : "Miles programs"}
            <span className="font-normal normal-case text-subtle tracking-normal">— {fr ? "optionnel" : "optional"}</span>
          </label>
          <ProgramsPicker value={programs} onChange={setPrograms} lang={lang} />
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="text-white text-sm bg-danger border border-danger/20 rounded-xl px-4 py-3 flex items-center gap-2">
            <span>⚠️</span>{error}
          </div>
        )}

        {/* CTA */}
        <button
          type="submit"
          disabled={busy || !canGo}
          className={clsx(
            "w-full py-3 sm:py-3.5 rounded-2xl text-white font-semibold text-base sm:text-sm transition-all duration-150",
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
            : `${fr ? "Optimiser mon vol" : "Optimize my flight"} →`
          }
        </button>
        </div>
      </form>
    </>
  );
}

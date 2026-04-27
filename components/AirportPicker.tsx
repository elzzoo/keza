"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { AIRPORTS } from "@/data/airports";
import type { Airport } from "@/data/airports";
import clsx from "clsx";

interface Props {
  label: string;
  labelEn: string;
  value: string;
  onChange: (code: string) => void;
  exclude?: string;
  lang: "fr" | "en";
  placeholder?: string;
}

// Default priority airports shown when picker opens (global top destinations)
const PRIORITY = [
  "DSS","CDG","JFK","LHR","DXB","IST","NBO","ABJ","LOS","ACC",
  "CMN","CAI","JNB","ADD","BKK","SIN","NRT","SYD","GRU","MEX",
];

export function AirportPicker({ label, labelEn, value, onChange, exclude, lang, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [apiResults, setApiResults] = useState<Airport[]>([]);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const selected = AIRPORTS.find((a) => a.code === value);
  const displayLabel = lang === "fr" ? label : labelEn;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  // Client-side search (410 airports — instant)
  const localResults = useMemo(() => {
    const lq = debouncedQuery.toLowerCase().trim();
    if (!lq) {
      return AIRPORTS.filter((a) => a.code !== exclude && PRIORITY.includes(a.code))
        .sort((a, b) => PRIORITY.indexOf(a.code) - PRIORITY.indexOf(b.code))
        .slice(0, 12);
    }
    return AIRPORTS.filter(
      (a) =>
        a.code !== exclude &&
        (a.code.toLowerCase().startsWith(lq) ||
          a.city.toLowerCase().includes(lq) ||
          a.cityEn.toLowerCase().includes(lq) ||
          a.country.toLowerCase().includes(lq) ||
          a.countryEn.toLowerCase().includes(lq))
    ).slice(0, 10);
  }, [debouncedQuery, exclude]);

  // Server-side search for airports not in client bundle (7914 total)
  const searchAPI = useCallback(async (q: string) => {
    if (q.length < 2) { setApiResults([]); return; }

    // Cancel previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSearching(true);
    try {
      const res = await fetch(`/api/airports?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      });
      if (!res.ok) return;
      const data = await res.json() as { results: Airport[] };
      if (!controller.signal.aborted) {
        setApiResults(data.results ?? []);
      }
    } catch {
      // Aborted or network error — ignore
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  }, []);

  // Trigger API search when local results are sparse
  useEffect(() => {
    const lq = debouncedQuery.trim();
    if (lq.length >= 2 && localResults.length < 3) {
      searchAPI(lq);
    } else {
      setApiResults([]);
    }
  }, [debouncedQuery, localResults.length, searchAPI]);

  // Merge local + API results (deduplicate by code)
  const filtered = useMemo(() => {
    const seen = new Set(localResults.map(a => a.code));
    const extra = apiResults.filter(a => !seen.has(a.code) && a.code !== exclude);
    return [...localResults, ...extra].slice(0, 12);
  }, [localResults, apiResults, exclude]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus the search input whenever the dropdown opens.
  // useEffect runs after React commits the DOM, so the input is guaranteed
  // to exist. A setTimeout-based focus fails on iOS Safari because it's
  // no longer inside the synchronous user-gesture event handler.
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const openDropdown = () => {
    setOpen(true); setQuery("");
  };

  const selectAirport = (airport: Airport) => {
    onChange(airport.code); setOpen(false); setQuery("");
  };

  return (
    <div className="relative" ref={containerRef}>
      <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5">
        {displayLabel}
      </p>
      <button
        type="button"
        onClick={openDropdown}
        className={clsx(
          "w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-150",
          open
            ? "border-primary/50 bg-primary/5 shadow-sm"
            : "border-border bg-surface-2 hover:border-primary/30 hover:bg-primary/5"
        )}
      >
        {selected ? (
          <>
            <span className="text-2xl flex-shrink-0 leading-none">{selected.flag}</span>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-fg text-lg leading-tight">{selected.code}</div>
              <div className="text-xs text-muted truncate">
                {lang === "fr" ? selected.city : selected.cityEn},{" "}
                {lang === "fr" ? selected.country : selected.countryEn}
              </div>
            </div>
          </>
        ) : (
          <span className="text-muted/60 text-sm">
            {placeholder ?? (lang === "fr" ? "Ex: Paris, CDG, Bangkok…" : "Ex: Paris, CDG, Bangkok…")}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-surface border border-border rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={lang === "fr" ? "Ville, pays ou code IATA…" : "City, country or IATA code…"}
                className="w-full pl-9 pr-3 py-2 bg-surface-2 border border-border rounded-lg text-fg text-sm placeholder-muted/50 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
              />
            </div>
          </div>

          {/* Results */}
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-6 text-muted text-sm">
                {searching ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    {lang === "fr" ? "Recherche…" : "Searching…"}
                  </span>
                ) : (
                  lang === "fr" ? "Aucun aéroport trouvé" : "No airport found"
                )}
              </div>
            ) : (
              filtered.map((airport) => (
                <button
                  key={airport.code}
                  type="button"
                  onClick={() => selectAirport(airport)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2 transition-colors duration-100 text-left"
                >
                  <span className="text-xl flex-shrink-0">{airport.flag}</span>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-sm text-fg">{airport.code}</span>
                    <span className="text-muted text-sm">
                      {" — "}
                      {lang === "fr" ? airport.city : airport.cityEn},{" "}
                      {lang === "fr" ? airport.country : airport.countryEn}
                    </span>
                  </div>
                </button>
              ))
            )}
            {searching && filtered.length > 0 && (
              <div className="text-center py-2 text-[10px] text-subtle">
                {lang === "fr" ? "Recherche d'autres aéroports…" : "Searching more airports…"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

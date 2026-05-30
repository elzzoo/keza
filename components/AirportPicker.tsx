"use client";

import { useState, useMemo, useRef, useEffect, useCallback, useId } from "react";
import { PRIORITY_AIRPORTS } from "@/data/airports";
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

// PRIORITY_AIRPORTS is imported from @/data/airports — shared source of truth

export function AirportPicker({ label, labelEn, value, onChange, exclude, lang, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [apiResults, setApiResults] = useState<Airport[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Stable unique IDs for ARIA relationships
  const uid = useId();
  const listboxId = `airport-listbox-${uid}`;
  const labelId = `airport-label-${uid}`;

  // Track recently-selected airports so the trigger button can display them
  // without shipping the full airport list to the client.
  const [knownAirports, setKnownAirports] = useState<Airport[]>(PRIORITY_AIRPORTS);
  const selected = knownAirports.find((a) => a.code === value);
  const displayLabel = lang === "fr" ? label : labelEn;

  // If `value` points to an airport we don't yet have in memory (e.g. set via
  // URL param or restored from profile), fetch its details from the API.
  useEffect(() => {
    if (!value) return;
    if (knownAirports.some((a) => a.code === value)) return;
    let cancelled = false;
    fetch(`/api/airports?q=${encodeURIComponent(value)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { results?: Airport[] } | null) => {
        if (cancelled || !data?.results) return;
        const match = data.results.find((a) => a.code === value);
        if (match) setKnownAirports((prev) => [...prev, match]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [value, knownAirports]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  // Client-side prefix match over PRIORITY_AIRPORTS only — keeps the bundle
  // tiny. The full 7914-airport list lives on the server and is reached
  // through `/api/airports` (see `searchAPI` below).
  const localResults = useMemo(() => {
    const lq = debouncedQuery.toLowerCase().trim();
    if (!lq) {
      return PRIORITY_AIRPORTS.filter((a) => a.code !== exclude).slice(0, 12);
    }
    return PRIORITY_AIRPORTS.filter(
      (a) =>
        a.code !== exclude &&
        (a.code.toLowerCase().startsWith(lq) ||
          a.city.toLowerCase().includes(lq) ||
          a.cityEn.toLowerCase().includes(lq) ||
          a.country.toLowerCase().includes(lq) ||
          a.countryEn.toLowerCase().includes(lq))
    ).slice(0, 6);
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

  // Trigger API search as soon as the user types — PRIORITY_AIRPORTS only
  // covers 20 hubs, so the API (which has the full 7914-airport list) does
  // the heavy lifting for everything else.
  useEffect(() => {
    const lq = debouncedQuery.trim();
    if (lq.length >= 2) {
      searchAPI(lq);
    } else {
      setApiResults([]);
    }
  }, [debouncedQuery, searchAPI]);

  // Merge local + API results (deduplicate by code)
  const filtered = useMemo(() => {
    const seen = new Set(localResults.map(a => a.code));
    const extra = apiResults.filter(a => !seen.has(a.code) && a.code !== exclude);
    return [...localResults, ...extra].slice(0, 12);
  }, [localResults, apiResults, exclude]);

  // Reset active index when results change
  useEffect(() => { setActiveIndex(-1); }, [filtered]);

  // Close on outside click/tap.
  // iOS Safari does not fire mousedown reliably on tap — add touchstart too.
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  // Focus the search input whenever the dropdown opens
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  // Scroll active option into view
  useEffect(() => {
    if (activeIndex < 0 || !listboxRef.current) return;
    const option = listboxRef.current.querySelector<HTMLElement>(
      `[id="${listboxId}-option-${activeIndex}"]`
    );
    option?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listboxId]);

  const openDropdown = () => { setOpen(true); setQuery(""); };

  const closeDropdown = () => { setOpen(false); setQuery(""); setActiveIndex(-1); };

  const selectAirport = (airport: Airport) => {
    // Remember the picked airport so the trigger button can render it
    // immediately without a round-trip to /api/airports.
    setKnownAirports((prev) =>
      prev.some((a) => a.code === airport.code) ? prev : [...prev, airport]
    );
    onChange(airport.code);
    closeDropdown();
  };

  // Keyboard navigation inside the search input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex(i => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && filtered[activeIndex]) {
          selectAirport(filtered[activeIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        closeDropdown();
        break;
      case "Tab":
        closeDropdown();
        break;
    }
  };

  const activeOptionId = activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  return (
    <div className="relative" ref={containerRef}>
      {/* Visually-hidden label so the button has an accessible name */}
      <p
        id={labelId}
        className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5"
      >
        {displayLabel}
      </p>

      {/* Trigger button — announces state to screen readers */}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-labelledby={labelId}
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
            <span className="text-2xl flex-shrink-0 leading-none" aria-hidden="true">
              {selected.flag}
            </span>
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
          {/* Search input — combobox role, controls the listbox */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <svg
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                ref={inputRef}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={open}
                aria-controls={listboxId}
                aria-activedescendant={activeOptionId}
                aria-label={lang === "fr" ? `Rechercher un aéroport — ${displayLabel}` : `Search airport — ${displayLabel}`}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={lang === "fr" ? "Ville, pays ou code IATA…" : "City, country or IATA code…"}
                className="w-full pl-9 pr-3 py-2 bg-surface-2 border border-border rounded-lg text-fg text-sm placeholder-muted/50 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
              />
            </div>
          </div>

          {/* Listbox */}
          <div
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            aria-label={displayLabel}
            className="max-h-64 overflow-y-auto"
          >
            {filtered.length === 0 ? (
              <div
                role="status"
                aria-live="polite"
                className="text-center py-6 text-muted text-sm"
              >
                {searching ? (
                  <span className="flex items-center justify-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin"
                      aria-hidden="true"
                    />
                    {lang === "fr" ? "Recherche…" : "Searching…"}
                  </span>
                ) : (
                  lang === "fr" ? "Aucun aéroport trouvé" : "No airport found"
                )}
              </div>
            ) : (
              filtered.map((airport, index) => (
                <button
                  key={airport.code}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={airport.code === value}
                  type="button"
                  onClick={() => selectAirport(airport)}
                  className={clsx(
                    "w-full flex items-center gap-3 px-4 py-2.5 transition-colors duration-100 text-left",
                    index === activeIndex
                      ? "bg-primary/10 text-fg"
                      : "hover:bg-surface-2"
                  )}
                >
                  <span className="text-xl flex-shrink-0" aria-hidden="true">{airport.flag}</span>
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
              <div
                role="status"
                aria-live="polite"
                className="text-center py-2 text-[10px] text-subtle"
              >
                {lang === "fr" ? "Recherche d'autres aéroports…" : "Searching more airports…"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

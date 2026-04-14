"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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

export function AirportPicker({ label, labelEn, value, onChange, exclude, lang, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = AIRPORTS.find((a) => a.code === value);
  const displayLabel = lang === "fr" ? label : labelEn;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(t);
  }, [query]);

  const filtered = useMemo(() => {
    const lq = debouncedQuery.toLowerCase().trim();
    if (!lq) {
      const priority = ["DSS", "DKR", "ABJ", "LOS", "ACC", "CMN", "CAI", "NBO", "JNB", "ADD"];
      return AIRPORTS.filter((a) => a.code !== exclude && priority.includes(a.code))
        .sort((a, b) => priority.indexOf(a.code) - priority.indexOf(b.code))
        .concat(AIRPORTS.filter((a) => a.code !== exclude && !priority.includes(a.code)))
        .slice(0, 8);
    }
    return AIRPORTS.filter(
      (a) =>
        a.code !== exclude &&
        (a.code.toLowerCase().includes(lq) ||
          a.city.toLowerCase().includes(lq) ||
          a.cityEn.toLowerCase().includes(lq) ||
          a.country.toLowerCase().includes(lq) ||
          a.countryEn.toLowerCase().includes(lq))
    ).slice(0, 8);
  }, [debouncedQuery, exclude]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openDropdown = () => {
    setOpen(true); setQuery("");
    setTimeout(() => inputRef.current?.focus(), 50);
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
            ? "border-primary/50 bg-blue-50/40 shadow-sm"
            : "border-slate-200 bg-white hover:border-primary/30 hover:bg-blue-50/20"
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
          <span className="text-muted text-sm">
            {placeholder ?? (lang === "fr" ? "Ex: Paris, CDG, Dakar…" : "Ex: Paris, CDG, Dakar…")}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white border border-slate-100 rounded-2xl shadow-lg overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-slate-100">
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
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-fg text-sm placeholder-muted/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
          </div>

          {/* Results */}
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-6 text-muted text-sm">
                {lang === "fr" ? "Aucun résultat" : "No results"}
              </div>
            ) : (
              filtered.map((airport) => (
                <button
                  key={airport.code}
                  type="button"
                  onClick={() => selectAirport(airport)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors duration-100 text-left"
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
          </div>
        </div>
      )}
    </div>
  );
}

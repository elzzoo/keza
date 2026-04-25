// app/carte/WorldMap.tsx
"use client";

import { useState, useCallback } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";
import type { Destination, Region } from "@/data/destinations";
import type { DealRecommendation } from "@/lib/dealsEngine";

export interface DestinationWithRec extends Destination {
  recommendation: DealRecommendation;
  cpm: number;
}

interface Props {
  destinations: DestinationWithRec[];
  lang: "fr" | "en";
}

const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

type RegionFilter = "all" | Region;

const REGION_FILTERS: { key: RegionFilter; labelFr: string; labelEn: string }[] = [
  { key: "all",         labelFr: "Toutes",       labelEn: "All" },
  { key: "africa",      labelFr: "🌍 Afrique",   labelEn: "🌍 Africa" },
  { key: "europe",      labelFr: "🇪🇺 Europe",   labelEn: "🇪🇺 Europe" },
  { key: "americas",    labelFr: "🌎 Amériques", labelEn: "🌎 Americas" },
  { key: "asia",        labelFr: "🌏 Asie",      labelEn: "🌏 Asia" },
  { key: "middle-east", labelFr: "🕌 M-Orient",  labelEn: "🕌 Mid-East" },
  { key: "oceania",     labelFr: "🇦🇺 Océanie",  labelEn: "🇦🇺 Oceania" },
];

const REC_COLORS: Record<DealRecommendation, string> = {
  USE_MILES: "#3b82f6",
  NEUTRAL:   "#10b981",
  USE_CASH:  "#f59e0b",
};

const REC_LABELS_FR: Record<DealRecommendation, string> = {
  USE_MILES: "MILES GAGNENT",
  NEUTRAL:   "SI TU AS LES MILES",
  USE_CASH:  "CASH GAGNE",
};

const REC_LABELS_EN: Record<DealRecommendation, string> = {
  USE_MILES: "MILES WIN",
  NEUTRAL:   "IF YOU HAVE MILES",
  USE_CASH:  "CASH WINS",
};

const L = {
  fr: {
    searchBtn: "Voir la destination →",
    cash: "Cash",
    miles: "miles",
    cpm: "¢/mile",
    close: "✕",
  },
  en: {
    searchBtn: "View destination →",
    cash: "Cash",
    miles: "miles",
    cpm: "¢/mile",
    close: "✕",
  },
};

export function WorldMap({ destinations, lang }: Props) {
  const t = L[lang];
  const [regionFilter, setRegionFilter] = useState<RegionFilter>("all");
  const [selected, setSelected] = useState<DestinationWithRec | null>(null);

  const handleMarkerClick = useCallback(
    (dest: DestinationWithRec) => {
      setSelected((prev) => (prev?.iata === dest.iata ? null : dest));
    },
    []
  );

  const handleMapClick = useCallback(() => {
    setSelected(null);
  }, []);

  const recLabels =
    lang === "fr" ? REC_LABELS_FR : REC_LABELS_EN;

  return (
    <div className="relative">
      {/* Region filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none -mx-4 px-4">
        {REGION_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setRegionFilter(f.key)}
            aria-pressed={regionFilter === f.key}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
              regionFilter === f.key
                ? "bg-primary/15 border-primary/35 text-blue-400"
                : "bg-transparent border-border text-muted hover:text-fg hover:border-border/60"
            }`}
          >
            {lang === "fr" ? f.labelFr : f.labelEn}
          </button>
        ))}
      </div>

      {/* Map container */}
      <div
        className="relative bg-surface border border-border rounded-2xl overflow-hidden"
        style={{ aspectRatio: "16/7" }}
        onClick={handleMapClick}
      >
        <ComposableMap
          projection="geoNaturalEarth1"
          style={{ width: "100%", height: "100%" }}
          projectionConfig={{ scale: 140, center: [20, 10] }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#1e2d3d"
                  stroke="#0d1117"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", fill: "#1e3a5f" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>

          {destinations.map((dest) => {
            const isFiltered =
              regionFilter !== "all" && dest.region !== regionFilter;
            const color = REC_COLORS[dest.recommendation];
            return (
              <Marker
                key={dest.iata}
                coordinates={[dest.lon, dest.lat]}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleMarkerClick(dest);
                }}
              >
                {/* Pulse ring for selected marker */}
                {selected?.iata === dest.iata && (
                  <circle r={14} fill={color} opacity={0.2} style={{ cursor: "pointer" }} />
                )}
                <circle
                  r={selected?.iata === dest.iata ? 8 : 6}
                  fill={color}
                  opacity={isFiltered ? 0.15 : 0.9}
                  stroke={selected?.iata === dest.iata ? "#fff" : "none"}
                  strokeWidth={1.5}
                  style={{ transition: "all 0.15s ease", cursor: "pointer" }}
                />
              </Marker>
            );
          })}
        </ComposableMap>

      </div>

      {/* Popup — desktop (below map) */}
      {selected && (
        <div className="hidden sm:block mt-3 bg-surface border border-border rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{selected.flag}</span>
              <div>
                <div className="font-black text-fg text-sm">{selected.city}</div>
                <div className="text-[11px] text-muted">{selected.country}</div>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-muted hover:text-fg text-xs px-2 py-1 rounded-lg hover:bg-surface-2">✕</button>
          </div>
          <div className="flex gap-4 mt-3 text-xs">
            <div><div className="text-muted">{t.cash}</div><div className="font-bold text-fg">${selected.cashEstimateUsd}</div></div>
            <div><div className="text-muted">{t.miles}</div><div className="font-bold text-fg">{(selected.milesEstimate / 1000).toFixed(0)}k</div></div>
            <div><div className="text-muted">CPM</div><div className="font-bold text-fg">{selected.cpm.toFixed(1)}{t.cpm}</div></div>
            <div className="ml-auto self-center inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black" style={{ backgroundColor: `${REC_COLORS[selected.recommendation]}22`, color: REC_COLORS[selected.recommendation], border: `1px solid ${REC_COLORS[selected.recommendation]}44` }}>{recLabels[selected.recommendation]}</div>
          </div>
          <a href={`/destinations/${selected.iata.toLowerCase()}`} className="block w-full text-center bg-primary text-white text-xs font-bold py-2 rounded-xl hover:bg-primary/90 transition-colors mt-3">{t.searchBtn}</a>
        </div>
      )}

      {/* Tooltip — mobile (fixed bottom) */}
      {selected && (
        <div
          className="sm:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border p-4 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{selected.flag}</span>
              <div>
                <div className="font-black text-fg text-sm">{selected.city}</div>
                <div className="text-[11px] text-muted">{selected.country}</div>
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              aria-label={lang === "fr" ? "Fermer" : "Close"}
              className="text-muted hover:text-fg text-sm px-2"
            >
              {t.close}
            </button>
          </div>
          <div className="flex gap-4 mb-3 text-xs">
            <div>
              <div className="text-muted">{t.cash}</div>
              <div className="font-bold text-fg">${selected.cashEstimateUsd}</div>
            </div>
            <div>
              <div className="text-muted">{t.miles}</div>
              <div className="font-bold text-fg">
                {(selected.milesEstimate / 1000).toFixed(0)}k
              </div>
            </div>
            <div>
              <div className="text-muted">CPM</div>
              <div className="font-bold text-fg">
                {selected.cpm.toFixed(1)}{t.cpm}
              </div>
            </div>
            <div
              className="ml-auto inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black"
              style={{
                backgroundColor: `${REC_COLORS[selected.recommendation]}22`,
                color: REC_COLORS[selected.recommendation],
              }}
            >
              {recLabels[selected.recommendation]}
            </div>
          </div>
          <a
            href={`/destinations/${selected.iata.toLowerCase()}`}
            className="block w-full text-center bg-primary text-white text-xs font-bold py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
          >
            {t.searchBtn}
          </a>
        </div>
      )}

      {/* Hint text */}
      <p className="text-[11px] text-muted mt-2">
        {lang === "fr" ? "Clique sur un point pour voir les prix cash & miles" : "Click a point to see cash & miles prices"}
      </p>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 flex-wrap">
        {(["USE_MILES", "NEUTRAL", "USE_CASH"] as DealRecommendation[]).map((rec) => (
          <div key={rec} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: REC_COLORS[rec] }}
            />
            <span className="text-[11px] text-muted">
              {lang === "fr" ? REC_LABELS_FR[rec] : REC_LABELS_EN[rec]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

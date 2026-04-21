"use client";

import { useEffect, useState, useMemo } from "react";
import { DESTINATIONS, type Destination, type Region } from "@/data/destinations";
import { trackDestinationClick } from "@/lib/analytics";

interface Props {
  lang: "fr" | "en";
  onSelect: (iata: string, city: string) => void;
  fromIata?: string; // ville de départ sélectionnée (pour pré-remplir)
}

type Filter = "all" | Region;

const FILTERS: { key: Filter; labelFr: string; labelEn: string }[] = [
  { key: "all",          labelFr: "Toutes",       labelEn: "All" },
  { key: "africa",       labelFr: "🌍 Afrique",   labelEn: "🌍 Africa" },
  { key: "europe",       labelFr: "🇪🇺 Europe",   labelEn: "🇪🇺 Europe" },
  { key: "americas",     labelFr: "🌎 Amériques", labelEn: "🌎 Americas" },
  { key: "asia",         labelFr: "🌏 Asie",      labelEn: "🌏 Asia" },
  { key: "middle-east",  labelFr: "🕌 M-Orient",  labelEn: "🕌 Mid-East" },
];

const L = {
  fr: { title: "Destinations à explorer", seeAll: "Voir tout →", from: "dès", pts: "pts" },
  en: { title: "Destinations to explore", seeAll: "See all →",   from: "from", pts: "pts" },
};

function DestinationCard({
  dest,
  lang,
  onSelect,
}: {
  dest: Destination;
  lang: "fr" | "en";
  onSelect: (iata: string, city: string) => void;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const t = L[lang];

  useEffect(() => {
    fetch(`/api/unsplash?query=${encodeURIComponent(dest.unsplashQuery)}`)
      .then((r) => r.json())
      .then((data: { url?: string | null }) => {
        if (data.url) setPhotoUrl(data.url);
      })
      .catch(() => {});
  }, [dest.unsplashQuery]);

  const bg = photoUrl
    ? `url(${photoUrl})`
    : `linear-gradient(135deg, rgb(var(--primary)/0.3), rgb(var(--surface-2)))`;

  return (
    <button
      onClick={() => {
        trackDestinationClick({ city: dest.city, iata: dest.iata });
        onSelect(dest.iata, dest.city);
      }}
      className="relative rounded-2xl overflow-hidden aspect-[4/3] group cursor-pointer w-full text-left"
      style={{ backgroundImage: bg, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:from-black/90 transition-all duration-200" />
      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="text-sm font-black text-white mb-1.5">
          {dest.flag} {dest.city}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold bg-white/20 backdrop-blur-sm text-white rounded-md px-2 py-0.5">
            {t.from} ${dest.cashEstimateUsd}
          </span>
          <span className="text-[11px] font-bold bg-primary/80 text-white rounded-md px-2 py-0.5">
            {(dest.milesEstimate / 1000).toFixed(0)}k {t.pts}
          </span>
        </div>
      </div>
    </button>
  );
}

export function DestinationsGrid({ lang, onSelect, fromIata }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const t = L[lang];

  const filtered = useMemo(
    () => filter === "all" ? DESTINATIONS : DESTINATIONS.filter((d) => d.region === filter),
    [filter]
  );

  // Afficher 6 par défaut (grille 2×3)
  const visible = filtered.slice(0, 6);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-black text-fg">{t.title}</h2>
        <span className="text-xs text-primary font-semibold cursor-pointer">{t.seeAll}</span>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none -mx-4 px-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
              filter === f.key
                ? "bg-primary/15 border-primary/35 text-blue-400"
                : "bg-transparent border-border text-muted hover:text-fg hover:border-border/60"
            }`}
          >
            {lang === "fr" ? f.labelFr : f.labelEn}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3">
        {visible.map((dest) => (
          <DestinationCard key={dest.iata} dest={dest} lang={lang} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

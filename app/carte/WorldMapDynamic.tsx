"use client";

import dynamic from "next/dynamic";
import type { DestinationWithRec } from "./WorldMap";

const WorldMapLazy = dynamic(() => import("./WorldMap").then(m => m.WorldMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 rounded-2xl bg-surface border border-border animate-pulse flex items-center justify-center">
      <div className="text-muted text-sm">Loading map...</div>
    </div>
  ),
});

export function WorldMapDynamic({ destinations, lang }: { destinations: DestinationWithRec[]; lang: "fr" | "en" }) {
  return <WorldMapLazy destinations={destinations} lang={lang} />;
}

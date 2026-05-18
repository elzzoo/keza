"use client";

// This client wrapper exists solely to allow `ssr: false` on WorldMap.
// next/dynamic with ssr:false is only valid inside client components —
// the parent page (carte/page.tsx) is a Server Component so it can't use it directly.
import dynamic from "next/dynamic";
import type { DestinationWithRec } from "./WorldMap";

const WorldMapLazy = dynamic(() => import("./WorldMap").then(m => m.WorldMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 rounded-2xl bg-surface border border-border animate-pulse" aria-busy="true" />
  ),
});

export function WorldMapDynamic({ destinations, lang }: { destinations: DestinationWithRec[]; lang: "fr" | "en" }) {
  return <WorldMapLazy destinations={destinations} lang={lang} />;
}

"use client";

import { useState } from "react";
import { MilesAlertModal } from "@/components/MilesAlertModal";

interface Props {
  from: string;
  to: string;
  cabin: string;
  program: string;
  /** Current CPP (¢ per mile/point) for this option */
  currentCpp: number;
  /** Cash price at time of display */
  currentPrice: number;
  lang?: "fr" | "en";
}

const L = {
  fr: {
    cta: "Alerte miles",
    tooltip: "Recevoir un email quand ce programme vaut autant ou plus",
  },
  en: {
    cta: "Miles alert",
    tooltip: "Get notified when this program reaches this value or better",
  },
};

export function MilesAlertButton({
  from,
  to,
  cabin: _cabin,
  program,
  currentCpp,
  currentPrice: _currentPrice,
  lang = "fr",
}: Props) {
  const t = L[lang];
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        title={t.tooltip}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-colors"
      >
        <span>🔔</span>
        <span>{t.cta}</span>
      </button>

      {isOpen && (
        <MilesAlertModal
          route={`${from}-${to}`}
          program={program}
          currentCpp={currentCpp}
          onClose={() => setIsOpen(false)}
          lang={lang}
        />
      )}
    </>
  );
}

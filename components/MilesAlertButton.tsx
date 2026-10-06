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

function BellIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}

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
        <BellIcon />
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

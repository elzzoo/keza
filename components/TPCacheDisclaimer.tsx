"use client";

import { useState } from "react";

interface Props {
  lang: "fr" | "en";
}

function InfoIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 11v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 8h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Disclaimer shown when Travelpayouts (TP) prices are displayed.
 * Informs users that prices are cached and may be 24-48 hours old.
 */
export const TPCacheDisclaimer = ({ lang }: Props) => {
  const [expanded, setExpanded] = useState(false);
  const fr = lang === "fr";

  return (
    <div className="bg-blue-500/10 border-b border-blue-500/20 px-5 py-2.5">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left flex items-start gap-2 hover:bg-blue-500/5 -mx-5 -my-2.5 px-5 py-2.5 rounded-lg transition-colors"
        aria-expanded={expanded}
      >
        <InfoIcon className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-blue-400 font-medium">
            {fr
              ? "Certains prix sont mis en cache (24-48h)"
              : "Some prices are cached (24-48 hours)"}
          </div>
          {expanded && (
            <div className="text-xs text-blue-400/70 mt-2 space-y-1">
              <p>
                {fr
                  ? "Les tarifs affichés en orange proviennent de Travelpayouts et datent de 24 à 48 heures. Les prix actuels sur les sites des compagnies aériennes peuvent être différents."
                  : "Orange-labeled prices come from Travelpayouts and are 24-48 hours old. Current prices on airline websites may differ."}
              </p>
            </div>
          )}
        </div>
        <span className="text-blue-400/50 flex-shrink-0 mt-0.5 text-xs">
          {expanded ? "−" : "+"}
        </span>
      </button>
    </div>
  );
};

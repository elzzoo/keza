"use client";

import { useState } from "react";

interface Props {
  lang: "fr" | "en";
}

function WarningIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path d="M12 8v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 17h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M10.29 4.86 2.82 17.8A2.1 2.1 0 0 0 4.64 21h14.72a2.1 2.1 0 0 0 1.82-3.2L13.71 4.86a2.1 2.1 0 0 0-3.42 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Disclaimer shown when USE_MILES recommendation is displayed.
 * Informs users that award availability is NOT verified in real-time.
 */
export const AwardAvailabilityDisclaimer = ({ lang }: Props) => {
  const [expanded, setExpanded] = useState(false);
  const fr = lang === "fr";

  return (
    <div className="bg-orange-500/10 border-b border-orange-500/20 px-5 py-2.5">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left flex items-start gap-2 hover:bg-orange-500/5 -mx-5 -my-2.5 px-5 py-2.5 rounded-lg transition-colors"
        aria-expanded={expanded}
      >
        <WarningIcon className="h-4 w-4 text-orange-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-orange-400 font-medium">
            {fr
              ? "Disponibilité awards non vérifiée en temps réel"
              : "Award availability not verified in real-time"}
          </div>
          {expanded && (
            <div className="text-xs text-orange-400/70 mt-2 space-y-1">
              <p>
                {fr
                  ? "Les places rewards affichées sont estimées selon les tarifs officiels. Vérifiez toujours la disponibilité actuelle sur le site du programme avant de transférer vos points."
                  : "The award prices shown are based on official rates. Always verify current availability on the program's website before transferring your points."}
              </p>
            </div>
          )}
        </div>
        <span className="text-orange-400/50 flex-shrink-0 mt-0.5 text-xs">
          {expanded ? "−" : "+"}
        </span>
      </button>
    </div>
  );
};

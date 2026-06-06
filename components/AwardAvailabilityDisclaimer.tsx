"use client";

import { useState } from "react";

interface Props {
  lang: "fr" | "en";
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
        <span className="text-orange-400 flex-shrink-0 mt-0.5">⚠️</span>
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

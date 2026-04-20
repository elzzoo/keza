"use client";

import type { FlightResult } from "@/lib/engine";

interface Props {
  results: FlightResult[];
  lang: "fr" | "en";
}

// Mapping: transfer source → recommended credit cards
const CARD_RECOMMENDATIONS: Record<string, { cards: string[]; note: { fr: string; en: string } }> = {
  "Amex MR": {
    cards: ["Amex Platinum", "Amex Gold", "Amex Business Platinum"],
    note: {
      fr: "Transférez vos points Amex MR 1:1 vers ce programme",
      en: "Transfer your Amex MR points 1:1 to this program",
    },
  },
  "Chase UR": {
    cards: ["Chase Sapphire Reserve", "Chase Sapphire Preferred", "Chase Ink Preferred"],
    note: {
      fr: "Transférez vos points Chase UR 1:1 vers ce programme",
      en: "Transfer your Chase UR points 1:1 to this program",
    },
  },
  "Citi ThankYou": {
    cards: ["Citi Premier", "Citi Prestige", "Citi Double Cash (avec ThankYou)"],
    note: {
      fr: "Transférez vos Citi ThankYou 1:1 vers ce programme",
      en: "Transfer your Citi ThankYou points 1:1 to this program",
    },
  },
  "Capital One Miles": {
    cards: ["Capital One Venture X", "Capital One Venture"],
    note: {
      fr: "Transférez vos Capital One Miles 1:1 vers ce programme",
      en: "Transfer your Capital One Miles 1:1 to this program",
    },
  },
};

export function CardRecommendation({ results, lang }: Props) {
  const fr = lang === "fr";

  // Find the best transfer option across all results
  const transferOptions = results
    .filter(r => r.bestOption?.via && r.bestOption.savings > 50)
    .sort((a, b) => b.savings - a.savings);

  if (transferOptions.length === 0) return null;

  const best = transferOptions[0];
  const via = best.bestOption?.via;
  if (!via) return null;

  // Check if via is a known bank currency
  const recommendation = CARD_RECOMMENDATIONS[via];
  if (!recommendation) return null;

  return (
    <div className="bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-2xl border border-primary/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">💳</span>
        <p className="text-sm font-bold text-fg">
          {fr ? "Carte recommandée" : "Recommended card"}
        </p>
      </div>

      <p className="text-xs text-muted leading-relaxed">
        {fr
          ? `Pour économiser jusqu'à $${best.savings.toFixed(0)} sur cette route, transférez vos points ${via} vers ${best.bestOption?.program}.`
          : `To save up to $${best.savings.toFixed(0)} on this route, transfer your ${via} points to ${best.bestOption?.program}.`
        }
      </p>

      <div className="flex flex-wrap gap-1.5">
        {recommendation.cards.map(card => (
          <span
            key={card}
            className="text-[10px] font-semibold bg-surface-2 border border-border px-2.5 py-1 rounded-lg text-fg"
          >
            {card}
          </span>
        ))}
      </div>

      <p className="text-[10px] text-muted italic">
        {recommendation.note[lang]}
      </p>
    </div>
  );
}

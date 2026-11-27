"use client";

import { useEffect, useState } from "react";
import { parseCardMarket, type CardMarket } from "@/lib/cardMarket";

const KEY = "keza_card_market";

/** The saved choice, or undefined so the server uses the visitor's country. */
export function readCardMarket(): CardMarket | undefined {
  try {
    return parseCardMarket(window.localStorage.getItem(KEY));
  } catch {
    return undefined;
  }
}

export function CardMarketSelect({ lang }: { lang: "fr" | "en" }) {
  const fr = lang === "fr";
  const [value, setValue] = useState<CardMarket | "">("");

  useEffect(() => setValue(readCardMarket() ?? ""), []);

  const onChange = (next: string) => {
    const market = parseCardMarket(next);
    setValue(market ?? "");
    try {
      if (market) window.localStorage.setItem(KEY, market);
      else window.localStorage.removeItem(KEY);
    } catch {
      // Private browsing: the choice simply is not remembered.
    }
  };

  return (
    <div>
      <label htmlFor="keza-card-market" className="block text-[11px] sm:text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5">
        {fr ? "Vos cartes de crédit" : "Your credit cards"}
      </label>
      <select
        id="keza-card-market"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-fg"
      >
        <option value="">{fr ? "Selon mon pays" : "Based on my country"}</option>
        <option value="US">{fr ? "Émises aux États-Unis" : "Issued in the United States"}</option>
        <option value="OTHER">{fr ? "Émises ailleurs" : "Issued elsewhere"}</option>
      </select>
      <p className="mt-1 text-[11px] text-subtle">
        {fr
          ? "Les transferts de points bancaires ne sont détaillés que pour les cartes américaines pour l'instant."
          : "Bank point transfers are only covered for US cards for now."}
      </p>
    </div>
  );
}

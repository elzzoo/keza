"use client";

import { useState, useCallback } from "react";
import clsx from "clsx";
import { trackShare } from "@/lib/analytics";

interface ShareButtonProps {
  lang: "fr" | "en";
  searchParams: {
    from: string;
    to: string;
    date: string;
    cabin: string;
    tripType: "oneway" | "roundtrip";
    pax?: number;
  };
  /** Best savings amount in user's currency (e.g. "$450") — enriches OG preview */
  savings?: string;
  /** Best cash price (e.g. "$1 200") — enriches OG preview */
  bestPrice?: string;
  /** Best miles program name — enriches OG preview */
  bestProgram?: string;
}

export function ShareButton({ lang, searchParams, savings, bestPrice, bestProgram }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const url = new URL(typeof window !== "undefined" ? window.location.origin + "/" : "https://keza-taupe.vercel.app/");
    url.searchParams.set("from", searchParams.from);
    url.searchParams.set("to", searchParams.to);
    url.searchParams.set("date", searchParams.date);
    url.searchParams.set("cabin", searchParams.cabin);
    url.searchParams.set("tripType", searchParams.tripType);
    url.searchParams.set("pax", String(searchParams.pax ?? 1));
    // OG enrichment params — picked up by /api/og for social previews
    if (savings)     url.searchParams.set("savings",  savings);
    if (bestPrice)   url.searchParams.set("price",    bestPrice);
    if (bestProgram) url.searchParams.set("program",  bestProgram);

    trackShare({ from: searchParams.from, to: searchParams.to });
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = url.toString();
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [searchParams]);

  return (
    <button
      type="button"
      onClick={handleShare}
      className={clsx(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
        "border",
        copied
          ? "bg-success/10 border-success/30 text-success"
          : "bg-surface border-border text-muted hover:text-fg hover:border-primary/40 hover:bg-surface-2"
      )}
    >
      {/* Link / check icon */}
      {copied ? (
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
      )}
      {copied
        ? lang === "fr"
          ? "Lien copié !"
          : "Copied!"
        : lang === "fr"
          ? "Partager"
          : "Share"}
    </button>
  );
}

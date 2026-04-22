"use client";

import { useState } from "react";
import clsx from "clsx";
import { CurrencyPicker } from "./CurrencyPicker";
import { ThemeToggle } from "./ThemeToggle";
import type { CurrencyCode } from "@/lib/currency";

interface Props {
  lang: "fr" | "en";
  onLangChange: (l: "fr" | "en") => void;
  currency?: CurrencyCode;
  onCurrencyChange?: (code: CurrencyCode) => void;
}

const NAV = {
  fr: [
    { label: "Comment ça marche", href: "/#how" },
    { label: "Calculateur", href: "/calculateur" },
    { label: "Carte", href: "/carte" },
    { label: "Prix", href: "/prix" },
    { label: "Alertes", href: "/alertes" },
    { label: "Comparer", href: "/comparer" },
    { label: "Programmes", href: "/programmes" },
    { label: "Pour les entreprises", href: "/entreprises" },
  ],
  en: [
    { label: "How it works", href: "/#how" },
    { label: "Calculator", href: "/calculateur" },
    { label: "Map", href: "/carte" },
    { label: "Prices", href: "/prix" },
    { label: "Alerts", href: "/alertes" },
    { label: "Compare", href: "/comparer" },
    { label: "Programs", href: "/programmes" },
    { label: "For Business", href: "/entreprises" },
  ],
};

export function Header({ lang, onLangChange, currency, onCurrencyChange }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = NAV[lang];

  return (
    <header className="sticky top-0 z-50 bg-bg/95 backdrop-blur-md border-b border-border">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="font-black text-xl tracking-tight leading-none">
            <span className="text-primary">KE</span>
            <span className="text-fg">ZA</span>
          </span>
          <span className="hidden sm:block text-[11px] text-muted font-medium border-l border-border pl-2 ml-0.5">
            {lang === "fr" ? "Cash ou Miles ?" : "Cash or Miles?"}
          </span>
        </a>

        {/* Nav — desktop */}
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 rounded-lg text-sm text-muted hover:text-fg hover:bg-surface-2 transition-all duration-150 font-medium"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 ml-auto">
          {/* Live badge */}
          <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 border border-success/15 text-[11px] font-semibold text-success">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
            Live
          </span>

          {/* Currency picker */}
          {currency && onCurrencyChange && (
            <CurrencyPicker currency={currency} onCurrencyChange={onCurrencyChange} />
          )}

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Lang toggle */}
          <div className="flex items-center rounded-lg border border-border bg-surface-2 p-0.5">
            {(["fr", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => onLangChange(l)}
                className={clsx(
                  "px-2.5 py-1 rounded-md text-xs font-bold uppercase transition-all duration-150",
                  lang === l
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted hover:text-fg"
                )}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-1.5 rounded-lg border border-border text-muted hover:text-fg hover:bg-surface-2 transition-all"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-surface px-4 py-2">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-3 rounded-lg text-sm text-muted hover:text-fg hover:bg-surface-2 transition-all font-medium"
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}

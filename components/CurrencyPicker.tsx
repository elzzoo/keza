"use client";

import { useState, useRef, useEffect } from "react";
import { CURRENCIES, QUICK_CURRENCIES, type CurrencyCode } from "@/lib/currency";

interface Props {
  currency: CurrencyCode;
  onCurrencyChange: (code: CurrencyCode) => void;
}

export function CurrencyPicker({ currency, onCurrencyChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const config = CURRENCIES[currency];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-muted bg-surface border border-border hover:border-primary/30 hover:text-fg transition-all"
        aria-label="Change currency"
      >
        <span>{config.flag}</span>
        <span>{currency}</span>
        <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-xl shadow-xl z-50 py-1 min-w-[180px] max-h-[320px] overflow-y-auto scrollbar-none animate-fade-up">
          {QUICK_CURRENCIES.map((code) => {
            const c = CURRENCIES[code];
            const isActive = code === currency;
            return (
              <button
                key={code}
                onClick={() => { onCurrencyChange(code); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-muted hover:bg-surface-2 hover:text-fg"
                }`}
              >
                <span className="text-sm">{c.flag}</span>
                <span className="font-semibold">{code}</span>
                <span className="text-subtle text-[10px] ml-auto">{c.symbol}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

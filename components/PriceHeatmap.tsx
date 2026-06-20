"use client";

import { useState, useEffect } from "react";

interface CalendarDay {
  date: string;
  price: number;
  stops: number;
  duration?: number;
}

interface Props {
  from: string;
  to: string;
  lang: "fr" | "en";
  cabin?: string;
  onSelectMonth?: (month: string) => void;
  formatPrice?: (usd: number) => string;
}

const CABIN_MULT: Record<string, number> = {
  economy: 1,
  premium: 1.8,
  business: 4,
  first: 6.5,
};

const MONTHS_SHORT_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
const MONTHS_SHORT_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getNextMonths(count: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push(m);
  }
  return months;
}

interface MonthData {
  month: string; // YYYY-MM
  minPrice: number;
}

function priceColor(ratio: number): string {
  if (ratio < 0.25) return "bg-emerald-500/25 border-emerald-500/40 text-emerald-300";
  if (ratio < 0.5)  return "bg-green-500/20 border-green-500/30 text-green-300";
  if (ratio < 0.75) return "bg-amber-500/20 border-amber-500/30 text-amber-300";
  return "bg-orange-500/20 border-orange-500/30 text-orange-300";
}

export function PriceHeatmap({ from, to, lang, cabin, onSelectMonth, formatPrice }: Props) {
  const fr = lang === "fr";
  const fmt = formatPrice ?? ((usd: number) => `$${Math.round(usd)}`);
  const mult = CABIN_MULT[cabin ?? "economy"] ?? 1;
  const monthNames = fr ? MONTHS_SHORT_FR : MONTHS_SHORT_EN;

  const [monthData, setMonthData] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!from || !to || from === to) {
      setLoading(false);
      return;
    }

    const cacheKey = `heatmap:${from}:${to}:${cabin ?? "economy"}`;
    const cached = typeof window !== "undefined" ? sessionStorage.getItem(cacheKey) : null;

    if (cached) {
      try {
        const data = JSON.parse(cached) as MonthData[];
        setMonthData(data);
        setLoading(false);
        return;
      } catch {
        // Invalid cache, proceed to fetch
      }
    }

    const months = getNextMonths(6);
    setLoading(true);

    Promise.all(
      months.map(async (m) => {
        try {
          const res = await fetch(`/api/calendar?from=${from}&to=${to}&month=${m}`);
          if (!res.ok) return null;
          const data = (await res.json()) as { days: CalendarDay[] };
          const days = data.days ?? [];
          if (days.length === 0) return null;
          const prices = days.map((d) => Math.round(d.price * mult));
          const minPrice = Math.min(...prices);
          return { month: m, minPrice } satisfies MonthData;
        } catch {
          return null;
        }
      })
    ).then((results) => {
      const valid = results.filter((r): r is MonthData => r !== null);
      setMonthData(valid);
      if (typeof window !== "undefined" && valid.length > 0) {
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(valid));
        } catch {
          // Storage full or unavailable, silently skip caching
        }
      }
      setLoading(false);
    });
  }, [from, to, cabin, mult]);

  if (loading) {
    return (
      <div className="bg-surface rounded-2xl border border-border p-4">
        <p className="text-xs text-muted uppercase tracking-wider mb-3">
          {fr ? "Meilleure période pour voler" : "Best time to fly"}
        </p>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="skeleton h-16 w-16 rounded-xl"
            />
          ))}
        </div>
      </div>
    );
  }

  if (monthData.length === 0) return null;

  const globalMin = Math.min(...monthData.map((m) => m.minPrice));
  const globalMax = Math.max(...monthData.map((m) => m.minPrice));
  const priceRange = globalMax - globalMin || 1;

  return (
    <div className="bg-surface rounded-2xl border border-border p-4">
      <p className="text-xs text-muted uppercase tracking-wider mb-3">
        {fr ? "Meilleure période pour voler" : "Best time to fly"}
      </p>
      <div className="flex flex-wrap gap-2">
        {monthData.map(({ month, minPrice }) => {
          const [yearStr, monthStr] = month.split("-");
          const monthIndex = parseInt(monthStr, 10) - 1;
          const isCheapest = minPrice === globalMin;
          const ratio = (minPrice - globalMin) / priceRange;
          const colorClass = priceColor(ratio);

          return (
            <button
              key={month}
              type="button"
              onClick={() => onSelectMonth?.(month)}
              className={`relative flex flex-col items-center justify-center gap-1 rounded-xl border px-3 py-2.5 min-w-[60px] transition-all hover:scale-105 hover:brightness-110 cursor-pointer ${colorClass}`}
            >
              {isCheapest && (
                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-emerald-400 text-black px-1.5 rounded-full whitespace-nowrap">
                  {fr ? "moins cher" : "cheapest"}
                </span>
              )}
              <span className="text-xs font-bold text-fg">
                {monthNames[monthIndex]}
              </span>
              <span className="text-[10px] font-semibold">
                {fmt(minPrice)}
              </span>
              <span className="text-[9px] opacity-60 text-fg">
                {yearStr}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

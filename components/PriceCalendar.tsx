"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import clsx from "clsx";

interface CalendarDay {
  date: string;
  price: number;
  stops: number;
  duration?: number;
}

interface Props {
  from: string;
  to: string;
  selectedDate: string;        // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  lang: "fr" | "en";
  cabin: string;
}

const CABIN_MULT: Record<string, number> = {
  economy: 1, premium: 1.8, business: 4, first: 6.5,
};

const WEEKDAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const WEEKDAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function getMonthParam(dateStr: string): string {
  return dateStr.slice(0, 7); // YYYY-MM
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfWeek(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Monday = 0
}

export function PriceCalendar({ from, to, selectedDate, onSelectDate, lang, cabin }: Props) {
  const fr = lang === "fr";
  const weekdays = fr ? WEEKDAYS_FR : WEEKDAYS_EN;
  const monthNames = fr ? MONTHS_FR : MONTHS_EN;
  const mult = CABIN_MULT[cabin] ?? 1;

  // Current viewing month
  const [viewMonth, setViewMonth] = useState(() => getMonthParam(selectedDate));
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const [year, month] = viewMonth.split("-").map(Number);

  // Fetch calendar prices
  const fetchCalendar = useCallback(async (m: string) => {
    if (!from || !to || from === to) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/calendar?from=${from}&to=${to}&month=${m}`);
      if (!res.ok) throw new Error();
      const data = await res.json() as { days: CalendarDay[] };
      setDays(data.days ?? []);
    } catch {
      setError(true);
      setDays([]);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchCalendar(viewMonth);
  }, [viewMonth, fetchCalendar]);

  // Price map: date → price (with cabin multiplier)
  const priceMap = useMemo(() => {
    const map = new Map<string, { price: number; stops: number }>();
    for (const d of days) {
      map.set(d.date, { price: Math.round(d.price * mult), stops: d.stops });
    }
    return map;
  }, [days, mult]);

  // Price range for heatmap coloring
  const prices = Array.from(priceMap.values()).map(v => v.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const priceRange = maxPrice - minPrice || 1;

  // Color: green (cheap) → yellow → red (expensive)
  function priceColor(price: number): string {
    const ratio = (price - minPrice) / priceRange;
    if (ratio < 0.25) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (ratio < 0.5) return "bg-green-500/15 text-green-400 border-green-500/25";
    if (ratio < 0.75) return "bg-yellow-500/15 text-yellow-400 border-yellow-500/25";
    return "bg-orange-500/15 text-orange-400 border-orange-500/25";
  }

  function cheapestLabel(price: number): string {
    return price === minPrice ? (fr ? "★ Meilleur" : "★ Best") : "";
  }

  // Navigation
  const today = new Date().toISOString().split("T")[0]!;
  const todayMonth = today.slice(0, 7);
  const canPrev = viewMonth > todayMonth;

  const prevMonth = () => {
    const d = new Date(year, month - 2, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (m >= todayMonth) setViewMonth(m);
  };
  const nextMonth = () => {
    const d = new Date(year, month, 1);
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  // Build calendar grid
  const numDays = daysInMonth(year, month - 1);
  const startDay = firstDayOfWeek(year, month - 1);
  const cells: Array<{ day: number; date: string } | null> = [];

  // Empty cells before first day
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= numDays; d++) {
    const date = `${viewMonth}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, date });
  }

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button
          type="button"
          onClick={prevMonth}
          disabled={!canPrev}
          className={clsx(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
            canPrev ? "hover:bg-surface-2 text-muted hover:text-fg" : "opacity-30 cursor-not-allowed text-subtle"
          )}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>

        <div className="text-center">
          <p className="text-sm font-bold text-fg">
            {monthNames[month - 1]} {year}
          </p>
          {!loading && prices.length > 0 && (
            <p className="text-[10px] text-muted">
              {fr ? "à partir de" : "from"} <span className="font-bold text-emerald-400">${minPrice}</span>
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={nextMonth}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-2 text-muted hover:text-fg transition-all"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {weekdays.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-subtle uppercase py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-border/30 p-px">
        {loading ? (
          // Skeleton
          Array.from({ length: 35 }, (_, i) => (
            <div key={i} className="bg-surface aspect-square flex items-center justify-center">
              <div className="skeleton w-8 h-8 rounded-lg" />
            </div>
          ))
        ) : (
          cells.map((cell, i) => {
            if (!cell) {
              return <div key={`empty-${i}`} className="bg-surface aspect-square" />;
            }

            const isPast = cell.date < today;
            const isSelected = cell.date === selectedDate;
            const entry = priceMap.get(cell.date);
            const isCheapest = entry && entry.price === minPrice;

            return (
              <button
                key={cell.date}
                type="button"
                disabled={isPast || !entry}
                onClick={() => entry && onSelectDate(cell.date)}
                className={clsx(
                  "bg-surface aspect-square flex flex-col items-center justify-center p-0.5 transition-all relative",
                  isPast && "opacity-30 cursor-not-allowed",
                  !entry && !isPast && "opacity-50",
                  isSelected && "ring-2 ring-primary ring-inset",
                  entry && !isPast && "hover:bg-surface-2 cursor-pointer",
                )}
              >
                <span className={clsx(
                  "text-xs font-medium",
                  isSelected ? "text-primary font-bold" : "text-fg"
                )}>
                  {cell.day}
                </span>
                {entry && (
                  <span className={clsx(
                    "text-[9px] font-bold px-1 py-0.5 rounded mt-0.5",
                    isCheapest
                      ? "bg-emerald-500/25 text-emerald-400"
                      : priceColor(entry.price).split(" ").slice(0, 2).join(" ")
                  )}>
                    ${entry.price}
                  </span>
                )}
                {isCheapest && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Legend */}
      {!loading && prices.length > 0 && (
        <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/30" />
              <span className="text-muted">{fr ? "Moins cher" : "Cheapest"}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-yellow-500/30" />
              <span className="text-muted">{fr ? "Moyen" : "Average"}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-orange-500/30" />
              <span className="text-muted">{fr ? "Plus cher" : "Pricier"}</span>
            </span>
          </div>
          {error && (
            <span className="text-[10px] text-danger">{fr ? "Erreur de chargement" : "Load error"}</span>
          )}
        </div>
      )}

      {!loading && prices.length === 0 && !error && from && to && from !== to && (
        <div className="px-4 py-6 text-center text-sm text-muted">
          {fr ? "Aucun prix disponible pour ce mois" : "No prices available for this month"}
        </div>
      )}
    </div>
  );
}

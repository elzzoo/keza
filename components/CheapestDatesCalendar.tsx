"use client";

import { useEffect, useState } from "react";

interface CalendarDay {
  date: string;  // YYYY-MM-DD
  price: number;
}

interface Props {
  from: string;
  to: string;
  lang: "fr" | "en";
}

const MONTH_NAMES_FR = ["Janv", "Févr", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];
const MONTH_NAMES_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_NAMES_FR = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];
const DAY_NAMES_EN = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function CheapestDatesCalendar({ from, to, lang }: Props) {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "empty">("loading");
  const fr = lang === "fr";

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setDays([]);
    fetch(`/api/calendar?from=${from}&to=${to}&month=${month}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: { days?: CalendarDay[] } | null) => {
        if (cancelled) return;
        if (!data?.days?.length) { setStatus("empty"); return; }
        setDays(data.days);
        setStatus("ok");
      })
      .catch(() => { if (!cancelled) setStatus("empty"); });
    return () => { cancelled = true; };
  }, [from, to, month]);

  function prevMonth() {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y!, m! - 1, 1);
    d.setMonth(d.getMonth() - 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  function nextMonth() {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y!, m! - 1, 1);
    d.setMonth(d.getMonth() + 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const [year, monthNum] = month.split("-").map(Number);
  const monthLabel = `${fr ? MONTH_NAMES_FR[monthNum! - 1] : MONTH_NAMES_EN[monthNum! - 1]} ${year}`;
  const dayNames = fr ? DAY_NAMES_FR : DAY_NAMES_EN;

  // Build calendar grid
  const firstDay = new Date(year!, monthNum! - 1, 1);
  // Monday-first: 0=Mon, 6=Sun
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year!, monthNum!, 0).getDate();

  // Price map
  const priceMap = new Map(days.map(d => [d.date, d.price]));
  const prices = days.map(d => d.price).filter(Boolean);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const threshold = minPrice + (maxPrice - minPrice) * 0.25; // bottom 25% = "cheap"

  const todayStr = new Date().toISOString().slice(0, 10);

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete rows
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-surface rounded-2xl border border-border p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-fg">
          {fr ? "Dates les moins chères" : "Cheapest dates"}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-2 text-muted hover:text-fg transition-colors text-sm"
          >
            ‹
          </button>
          <span className="text-xs font-semibold text-fg min-w-[72px] text-center">{monthLabel}</span>
          <button
            type="button"
            onClick={nextMonth}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-2 text-muted hover:text-fg transition-colors text-sm"
          >
            ›
          </button>
        </div>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1">
        {dayNames.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-subtle py-1">{d}</div>
        ))}
      </div>

      {/* Calendar cells */}
      {status === "loading" ? (
        <div className="grid grid-cols-7 gap-1">
          {Array(35).fill(null).map((_, i) => (
            <div key={i} className="h-10 rounded-lg skeleton" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />;
            const dateStr = `${year}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const price = priceMap.get(dateStr);
            const isCheap = price !== undefined && price <= threshold;
            const isPast = dateStr < todayStr;
            const isToday = dateStr === todayStr;

            return (
              <a
                key={i}
                href={price ? `/?from=${from}&to=${to}&date=${dateStr}` : undefined}
                className={[
                  "relative flex flex-col items-center justify-center rounded-lg py-1.5 text-center transition-all",
                  price && !isPast ? "cursor-pointer hover:scale-105" : "cursor-default",
                  isPast ? "opacity-30" : "",
                  isToday ? "ring-1 ring-primary/50" : "",
                  isCheap && !isPast
                    ? "bg-success/15 border border-success/30"
                    : price && !isPast
                    ? "bg-surface-2 border border-border hover:border-primary/30"
                    : "",
                ].join(" ")}
              >
                <span className={`text-xs font-semibold ${isCheap ? "text-success" : "text-muted"}`}>
                  {day}
                </span>
                {price !== undefined && !isPast && (
                  <span className={`text-[9px] font-bold leading-tight ${isCheap ? "text-success" : "text-subtle"}`}>
                    ${price}
                  </span>
                )}
              </a>
            );
          })}
        </div>
      )}

      {status === "ok" && minPrice > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted pt-1 border-t border-border">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-success/30 border border-success/40 inline-block" />
            {fr ? `Dès $${minPrice}` : `From $${minPrice}`}
          </span>
          <span className="text-subtle">·</span>
          <span>{fr ? `Max $${maxPrice}` : `High $${maxPrice}`}</span>
        </div>
      )}

      {status === "empty" && (
        <p className="text-xs text-muted text-center py-4">
          {fr ? "Données non disponibles pour ce mois" : "No data available for this month"}
        </p>
      )}
    </div>
  );
}

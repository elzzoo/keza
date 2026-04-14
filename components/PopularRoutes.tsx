"use client";

interface Route {
  from: string;
  to: string;
  fromFlag: string;
  toFlag: string;
  label: string;
}

const ROUTES: Route[] = [
  { from: "DSS", to: "CDG", fromFlag: "🇸🇳", toFlag: "🇫🇷", label: "Dakar → Paris" },
  { from: "ABJ", to: "CDG", fromFlag: "🇨🇮", toFlag: "🇫🇷", label: "Abidjan → Paris" },
  { from: "LOS", to: "LHR", fromFlag: "🇳🇬", toFlag: "🇬🇧", label: "Lagos → Londres" },
  { from: "CMN", to: "JFK", fromFlag: "🇲🇦", toFlag: "🇺🇸", label: "Casablanca → New York" },
  { from: "NBO", to: "CDG", fromFlag: "🇰🇪", toFlag: "🇫🇷", label: "Nairobi → Paris" },
  { from: "ACC", to: "LHR", fromFlag: "🇬🇭", toFlag: "🇬🇧", label: "Accra → Londres" },
];

interface Props {
  lang: "fr" | "en";
  onSelect: (from: string, to: string) => void;
}

export function PopularRoutes({ lang, onSelect }: Props) {
  return (
    <div>
      <p className="section-rule mb-3">
        {lang === "fr" ? "Routes populaires" : "Popular routes"}
      </p>
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {ROUTES.map((r) => (
          <button
            key={`${r.from}-${r.to}`}
            onClick={() => onSelect(r.from, r.to)}
            className="flex-shrink-0 flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-fg hover:border-primary hover:text-primary hover:bg-blue-50/30 transition-all duration-150 shadow-sm group"
          >
            <span>{r.fromFlag}</span>
            <span className="font-semibold">{r.from}</span>
            <span className="text-slate-300 group-hover:text-primary/40">→</span>
            <span className="font-semibold">{r.to}</span>
            <span>{r.toFlag}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
